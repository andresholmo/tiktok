import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
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
  console.log('=== CRON SYNC: Iniciando ===')
  console.log('Horário:', new Date().toISOString())
  console.log('URL:', request.url)
  console.log('Method:', request.method)
  
  // Verificar autorização do Vercel Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  console.log('Auth header presente:', !!authHeader)
  console.log('Cron secret configurado:', !!cronSecret)
  
  if (!cronSecret) {
    console.error('CRON_SECRET não configurado')
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 })
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Não autorizado - header inválido')
    console.error('Header recebido:', authHeader ? 'presente' : 'ausente')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  
  console.log('=== CRON SYNC: Autorizado, executando... ===')

  try {
    // IMPORTANTE: Usar cliente Supabase com service role para bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('CRON: Variáveis Supabase não configuradas')
      console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
      console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar TODAS as credenciais (sem filtro, sem .single())
    console.log('CRON: Buscando credenciais...')
    
    const { data: credentials, error: credError } = await supabase
      .from('tiktok_credentials')
      .select('user_id, access_token, advertiser_id')
    
    console.log('CRON: Query executada')
    console.log('CRON: Erro:', credError)
    console.log('CRON: Quantidade de credenciais:', credentials?.length || 0)
    
    if (credError) {
      console.error('CRON: Erro ao buscar credenciais:', credError)
      return NextResponse.json({ error: 'Erro ao buscar credenciais', details: credError }, { status: 500 })
    }

    if (!credentials || credentials.length === 0) {
      console.log('CRON: Nenhuma credencial encontrada')
      return NextResponse.json({ message: 'Nenhum usuário para sincronizar' })
    }

    console.log(`CRON: Encontradas ${credentials.length} credencial(is)`)

    // Verificar se há data customizada
    const { searchParams } = new URL(request.url)
    const customDate = searchParams.get('date')
    
    // Calcular data de hoje (horário de Brasília) se não fornecida
    let syncDate = customDate
    if (!syncDate) {
      const now = new Date()
      const brasilOffset = -3 * 60 // UTC-3
      const utcOffset = now.getTimezoneOffset()
      now.setMinutes(now.getMinutes() + utcOffset + brasilOffset)
      syncDate = now.toISOString().split('T')[0]
    }
    
    console.log(`CRON: Sincronizando data ${syncDate}`)

    const results = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    // Sincronizar para cada usuário
    for (const cred of credentials) {
      console.log(`CRON: Processando usuário ${cred.user_id}`)
      
      try {
        // 1. Buscar TikTok
        console.log(`CRON: Buscando TikTok para ${cred.user_id}...`)
        const tiktokResponse = await fetch(`${baseUrl}/api/tiktok/report`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': cred.user_id,
          },
          body: JSON.stringify({ 
            startDate: syncDate, 
            endDate: syncDate,
            userId: cred.user_id,
          }),
        })
        const tiktokData = await tiktokResponse.json()
        console.log('CRON: TikTok response:', tiktokData.success, tiktokData.campaigns?.length || 0, 'campanhas')
        
        if (!tiktokData.success && !tiktokData.campaigns) {
          throw new Error(tiktokData.error || 'Erro ao buscar TikTok')
        }

        // 2. Buscar GAM
        console.log(`CRON: Buscando GAM para ${cred.user_id}...`)
        const gamResponse = await fetch(`${baseUrl}/api/gam/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: syncDate, endDate: syncDate }),
        })
        const gamData = await gamResponse.json()
        console.log('CRON: GAM response:', gamData.success)

        // 3. Buscar Faturamento
        console.log(`CRON: Buscando faturamento para ${cred.user_id}...`)
        const faturamentoResponse = await fetch(`${baseUrl}/api/gam/faturamento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: syncDate, endDate: syncDate }),
        })
        const faturamentoData = await faturamentoResponse.json()
        console.log('CRON: Faturamento response:', faturamentoData.success)

        // 4. Salvar
        console.log(`CRON: Salvando dados para ${cred.user_id}...`)
        const tiktokCampaigns = tiktokData.campaigns || []
        const totalTiktokSpend = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.gasto || 0), 0)
        const totalTiktokImpressions = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.impressoes || 0), 0)
        const totalTiktokClicks = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.cliques || 0), 0)

        const saveResponse = await fetch(`${baseUrl}/api/import/save`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': cred.user_id,
            'x-sync-type': 'cron',
          },
          body: JSON.stringify({
            startDate: syncDate,
            endDate: syncDate,
            userId: cred.user_id,
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
        console.log('CRON: Save response:', saveResult.success)

        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Erro ao salvar')
        }

        // 5. Atualizar sync_status
        await supabase
          .from('sync_status')
          .upsert({
            user_id: cred.user_id,
            last_sync_at: new Date().toISOString(),
            sync_type: 'cron',
            status: 'success',
          }, { onConflict: 'user_id' })

        results.push({
          userId: cred.user_id,
          success: true,
          campaigns: tiktokCampaigns.length,
          roi: saveResult.summary?.roiRastreado || saveResult.summary?.roi,
        })
        
      } catch (err: any) {
        console.error(`CRON: Erro usuário ${cred.user_id}:`, err.message)
        results.push({
          userId: cred.user_id,
          success: false,
          error: err.message,
        })
      }
    }

    console.log('=== CRON SYNC: Concluído ===')
    console.log('Resultados:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída`,
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

