import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: credentials, error: credError } = await supabase
      .from('tiktok_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (credError || !credentials) {
      return NextResponse.json({ error: 'TikTok não conectado' }, { status: 400 })
    }

    if (!credentials.access_token || !credentials.advertiser_id) {
      return NextResponse.json({ error: 'Credenciais incompletas. Reconecte o TikTok.' }, { status: 400 })
    }

    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    const advertiserId = credentials.advertiser_id
    const accessToken = credentials.access_token

    // ========== 1. BUSCAR RELATÓRIO (gastos, CPC, CTR) ==========
    const reportParams = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['campaign_id']),
      metrics: JSON.stringify(['campaign_name', 'spend', 'cpc', 'ctr', 'impressions', 'clicks']),
      start_date: startDate,
      end_date: endDate,
      page_size: '1000',
    })

    const reportUrl = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${reportParams.toString()}`

    console.log('=== BUSCANDO RELATÓRIO ===')
    
    const reportResponse = await fetch(reportUrl, {
      method: 'GET',
      headers: { 'Access-Token': accessToken },
    })

    const reportText = await reportResponse.text()
    let reportData
    try {
      reportData = JSON.parse(reportText)
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao parsear relatório' }, { status: 500 })
    }

    if (reportData.code !== 0) {
      return NextResponse.json({ error: reportData.message || 'Erro no relatório' }, { status: 500 })
    }

    // ========== 2. BUSCAR CAMPANHAS (orçamento, status) ==========
    const campaignUrl = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&page_size=1000`

    console.log('=== BUSCANDO CAMPANHAS ===')

    const campaignResponse = await fetch(campaignUrl, {
      method: 'GET',
      headers: { 'Access-Token': accessToken },
    })

    const campaignText = await campaignResponse.text()
    let campaignData
    try {
      campaignData = JSON.parse(campaignText)
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao parsear campanhas' }, { status: 500 })
    }

    if (campaignData.code !== 0) {
      console.error('Erro ao buscar campanhas:', campaignData.message)
      // Continuar mesmo sem dados de campanha
    }

    // ========== 3. CRIAR MAPA DE CAMPANHAS (por campaign_id) ==========
    const campaignMap = new Map<string, any>()
    
    if (campaignData.data?.list) {
      for (const camp of campaignData.data.list) {
        // Budget pode ser diário ou total, dependendo do budget_mode
        // BUDGET_MODE_DAY = orçamento diário
        // BUDGET_MODE_TOTAL = orçamento total
        const budgetMode = camp.budget_mode || camp.budget_type || 'BUDGET_MODE_DAY'
        const budget = parseFloat(camp.budget || camp.daily_budget || '0') || 0
        
        campaignMap.set(camp.campaign_id, {
          budget: budget,
          budget_mode: budgetMode,
          status: camp.operation_status || camp.status || 'UNKNOWN',
          campaign_name: camp.campaign_name,
        })
      }
    }

    console.log('Campanhas no mapa:', campaignMap.size)

    // ========== 4. COMBINAR DADOS ==========
    const reportList = reportData.data?.list || []
    
    const campaigns = reportList.map((item: any) => {
      const metrics = item.metrics || {}
      const dimensions = item.dimensions || {}
      const campaignId = dimensions.campaign_id || ''
      
      // Buscar dados adicionais da campanha
      const campaignInfo = campaignMap.get(campaignId) || {}
      
      // Determinar status
      let status = 'ATIVO'
      if (campaignInfo.status === 'DISABLE' || campaignInfo.status === 'DELETE') {
        status = 'PAUSADO'
      } else if (campaignInfo.status === 'ENABLE') {
        status = 'ATIVO'
      }

      // CTR da API do TikTok já vem em formato percentual (ex: 2.24 = 2.24%)
      // NÃO multiplicar por 100
      const ctrValue = parseFloat(metrics.ctr) || 0

      // Determinar orçamento diário
      // Se budget_mode for BUDGET_MODE_TOTAL, dividir por dias do período
      let orcamentoDiario = campaignInfo.budget || 0
      if (campaignInfo.budget_mode === 'BUDGET_MODE_TOTAL' && campaignInfo.budget > 0) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const dias = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        orcamentoDiario = campaignInfo.budget / dias
      }

      return {
        campaign_id: campaignId,
        campanha: metrics.campaign_name || campaignInfo.campaign_name || 'Sem nome',
        gasto: parseFloat(metrics.spend) || 0,
        cpc: parseFloat(metrics.cpc) || 0,
        ctr: ctrValue, // CTR já vem em formato percentual da API do TikTok
        impressoes: parseInt(metrics.impressions) || 0,
        cliques: parseInt(metrics.clicks) || 0,
        orcamento_diario: orcamentoDiario,
        budget_mode: campaignInfo.budget_mode || 'BUDGET_MODE_DAY',
        status: status,
      }
    })

    // Filtrar campanhas com gasto > 0
    const campanhasComGasto = campaigns.filter((c: any) => c.gasto > 0)

    console.log('Campanhas com gasto:', campanhasComGasto.length)

    return NextResponse.json({
      success: true,
      campaigns: campanhasComGasto,
      total: campanhasComGasto.length,
      periodo: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('Erro geral:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
