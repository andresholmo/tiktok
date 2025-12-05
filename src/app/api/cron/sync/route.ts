import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayBR } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos máximo

// Verificar token de autorização
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Vercel envia o header automaticamente para cron jobs
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  return false
}

export async function GET(request: NextRequest) {
  console.log('=== CRON: Iniciando sincronização automática ===')
  console.log('Horário:', new Date().toISOString())
  
  // Verificar autorização
  if (!isAuthorized(request)) {
    console.error('CRON: Não autorizado')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    
    // Buscar todos os usuários com credenciais TikTok configuradas
    const { data: credentials, error: credError } = await supabase
      .from('tiktok_credentials')
      .select('user_id, access_token, advertiser_id')
    
    if (credError) {
      console.error('CRON: Erro ao buscar credenciais:', credError)
      return NextResponse.json({ error: 'Erro ao buscar credenciais' }, { status: 500 })
    }

    if (!credentials || credentials.length === 0) {
      console.log('CRON: Nenhum usuário com credenciais TikTok')
      return NextResponse.json({ message: 'Nenhum usuário para sincronizar' })
    }

    // Verificar se há data customizada
    const { searchParams } = new URL(request.url)
    const customDate = searchParams.get('date')
    
    // Usar data customizada ou data de hoje
    const syncDate = customDate || getTodayBR()
    
    console.log(`CRON: Sincronizando data ${syncDate}`)

    const results = []

    // Sincronizar para cada usuário
    for (const cred of credentials) {
      console.log(`CRON: Sincronizando usuário ${cred.user_id}`)
      
      try {
        const result = await syncUserData(cred.user_id, cred.access_token, cred.advertiser_id, syncDate, syncDate)
        results.push({ userId: cred.user_id, success: true, ...result })
      } catch (err: any) {
        console.error(`CRON: Erro usuário ${cred.user_id}:`, err.message)
        results.push({ userId: cred.user_id, success: false, error: err.message })
      }
    }

    console.log('=== CRON: Sincronização concluída ===')
    console.log('Resultados:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída para ${results.length} usuário(s)`,
      date: syncDate,
      results,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('CRON: Erro geral:', error)
    return NextResponse.json(
      { error: 'Erro na sincronização', details: error.message },
      { status: 500 }
    )
  }
}

// Função para sincronizar dados de um usuário
async function syncUserData(
  userId: string,
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // 1. Buscar dados do TikTok
  console.log(`CRON: Buscando TikTok para ${userId}...`)
  const tiktokResponse = await fetch(`${baseUrl}/api/tiktok/report`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': userId,  // Passar userId para a API
    },
    body: JSON.stringify({ startDate, endDate, userId }),
  })
  
  const tiktokData = await tiktokResponse.json()
  
  if (!tiktokData.success && !tiktokData.campaigns) {
    throw new Error(tiktokData.error || 'Erro ao buscar TikTok')
  }

  // 2. Buscar dados do GAM
  console.log(`CRON: Buscando GAM para ${userId}...`)
  const gamResponse = await fetch(`${baseUrl}/api/gam/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate }),
  })
  
  const gamData = await gamResponse.json()

  // 3. Buscar faturamento total
  console.log(`CRON: Buscando faturamento para ${userId}...`)
  const faturamentoResponse = await fetch(`${baseUrl}/api/gam/faturamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate }),
  })
  
  const faturamentoData = await faturamentoResponse.json()

  // 4. Salvar dados
  console.log(`CRON: Salvando dados para ${userId}...`)
  const tiktokCampaigns = tiktokData.campaigns || []
  const totalTiktokSpend = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.gasto || 0), 0)
  const totalTiktokImpressions = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.impressoes || 0), 0)
  const totalTiktokClicks = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.cliques || 0), 0)

  const saveResponse = await fetch(`${baseUrl}/api/import/save`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-sync-type': 'cron',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      userId,
      tiktok: {
        campaigns: tiktokCampaigns,
        totalSpend: totalTiktokSpend,
        totalImpressions: totalTiktokImpressions,
        totalClicks: totalTiktokClicks,
      },
      gam: {
        campaigns: gamData.finalCampaigns || gamData.campaigns || [],
        totalRevenue: gamData.totalReceita || 0,
        faturamentoTotal: faturamentoData.success ? faturamentoData.faturamentoTikTok : 0,
        totalImpressions: gamData.totalImpressoes || 0,
        totalClicks: gamData.totalCliques || 0,
      },
    }),
  })

  const saveResult = await saveResponse.json()

  if (!saveResult.success) {
    throw new Error(saveResult.error || 'Erro ao salvar')
  }

  return {
    tiktokCampaigns: tiktokCampaigns.length,
    gamCampaigns: (gamData.finalCampaigns || gamData.campaigns || []).length,
    roi: saveResult.summary?.roi,
  }
}

