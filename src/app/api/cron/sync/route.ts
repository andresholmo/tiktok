import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutos máximo

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

    const results: { userId: string; success: boolean; campaigns?: number; accounts?: number; roi?: number; error?: string }[] = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    for (const cred of credentials) {
      const userId = cred.user_id
      console.log(`CRON: Processando usuário ${userId}`)

      const { data: userAccounts } = await supabase
        .from('tiktok_accounts')
        .select('id, advertiser_id, name')
        .eq('user_id', userId)

      const accounts = userAccounts && userAccounts.length > 0
        ? userAccounts
        : (cred.advertiser_id ? [{ advertiser_id: cred.advertiser_id, name: 'Conta principal' }] : [])

      if (!accounts || accounts.length === 0) {
        console.log(`CRON: Usuário ${userId} sem contas TikTok`)
        results.push({ userId, success: false, error: 'Nenhuma conta TikTok' })
        continue
      }

      try {
        let gamData: any
        let faturamentoData: any

        const gamResponse = await fetch(`${baseUrl}/api/gam/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: syncDate, endDate: syncDate }),
        })
        gamData = await gamResponse.json()

        const faturamentoResponse = await fetch(`${baseUrl}/api/gam/faturamento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: syncDate, endDate: syncDate }),
        })
        faturamentoData = await faturamentoResponse.json()

        let totalCampaigns = 0
        for (const account of accounts) {
          const advertiserId = account.advertiser_id
          if (!advertiserId) continue

          const tiktokResponse = await fetch(`${baseUrl}/api/tiktok/report`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
              'x-advertiser-id': advertiserId,
            },
            body: JSON.stringify({
              startDate: syncDate,
              endDate: syncDate,
              userId,
            }),
          })
          const tiktokData = await tiktokResponse.json()
          const tiktokCampaigns = tiktokData.campaigns || []
          if (!tiktokData.success && tiktokCampaigns.length === 0 && tiktokData.error) {
            console.error(`CRON: TikTok erro conta ${advertiserId}:`, tiktokData.error)
            continue
          }

          const totalTiktokSpend = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.gasto || 0), 0)
          const totalTiktokImpressions = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.impressoes || 0), 0)
          const totalTiktokClicks = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.cliques || 0), 0)

          const saveResponse = await fetch(`${baseUrl}/api/import/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
              'x-advertiser-id': advertiserId,
              'x-sync-type': 'cron',
            },
            body: JSON.stringify({
              startDate: syncDate,
              endDate: syncDate,
              userId,
              advertiserId,
              tiktok: {
                campaigns: tiktokCampaigns,
                totalSpend: totalTiktokSpend,
                totalImpressions: totalTiktokImpressions,
                totalClicks: totalTiktokClicks,
              },
              gam: {
                campaigns: gamData?.finalCampaigns || gamData?.campaigns || [],
                totalRevenue: gamData?.totalReceita || 0,
                faturamentoTotal: faturamentoData?.success ? faturamentoData.faturamentoTikTok : 0,
                totalImpressions: gamData?.totalImpressoes || 0,
                totalClicks: gamData?.totalCliques || 0,
              },
            }),
          })
          const saveResult = await saveResponse.json()
          if (saveResult.success) {
            totalCampaigns += tiktokCampaigns.length
          }
        }

        await supabase
          .from('sync_status')
          .upsert({
            user_id: userId,
            last_sync_at: new Date().toISOString(),
            sync_type: 'cron',
            status: 'success',
          }, { onConflict: 'user_id' })

        results.push({
          userId,
          success: true,
          campaigns: totalCampaigns,
          accounts: accounts.length,
        })
      } catch (err: any) {
        console.error(`CRON: Erro usuário ${userId}:`, err.message)
        results.push({ userId, success: false, error: err.message })
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

