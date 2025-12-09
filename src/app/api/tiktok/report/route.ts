import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Obter userId da sessão OU do header (para cron)
    const { data: { user } } = await supabase.auth.getUser()
    const userIdFromHeader = request.headers.get('x-user-id')
    const userId = user?.id || userIdFromHeader

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: credentials, error: credError } = await supabase
      .from('tiktok_credentials')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (credError || !credentials) {
      return NextResponse.json({ error: 'TikTok não conectado' }, { status: 400 })
    }

    if (!credentials.access_token || !credentials.advertiser_id) {
      return NextResponse.json({ error: 'Credenciais incompletas. Reconecte o TikTok.' }, { status: 400 })
    }

    const body = await request.json()
    const { startDate, endDate, userId: bodyUserId } = body
    
    // Usar userId do body se fornecido (para cron), senão usar da sessão
    const finalUserId = bodyUserId || userId

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
      metrics: JSON.stringify(['campaign_name', 'spend', 'cpc', 'ctr', 'impressions', 'clicks', 'conversion', 'cost_per_conversion', 'conversion_rate']),
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

    // ========== 2. BUSCAR CAMPANHAS (orçamento, status, tipo) ==========
    const campaignParams = new URLSearchParams({
      advertiser_id: advertiserId,
      fields: JSON.stringify(['campaign_id', 'campaign_name', 'budget', 'budget_mode', 'operation_status', 'objective_type', 'is_smart_performance_campaign', 'campaign_type']),
      page_size: '1000',
    })
    const campaignUrl = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?${campaignParams.toString()}`

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

    // ========== DEBUG SMART PLUS: Resposta da API de campanhas ==========
    console.log('=== DEBUG SMART PLUS: Resposta da API de campanhas ===')
    console.log('Total de campanhas:', campaignData?.data?.list?.length || 0)
    
    // Log detalhado de cada campanha
    if (campaignData?.data?.list) {
      campaignData.data.list.forEach((camp: any) => {
        console.log(`Campanha: ${camp.campaign_name}`)
        console.log(`  - campaign_id: ${camp.campaign_id}`)
        console.log(`  - objective_type: ${camp.objective_type}`)
        console.log(`  - is_smart_performance_campaign: ${camp.is_smart_performance_campaign} (tipo: ${typeof camp.is_smart_performance_campaign})`)
        console.log(`  - campaign_type: ${camp.campaign_type}`)
        console.log(`  - Todos os campos:`, Object.keys(camp).join(', '))
      })
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
        
        // Identificar Smart Plus com lógica robusta
        const isSmartPlus = 
          camp.is_smart_performance_campaign === true ||
          camp.is_smart_performance_campaign === 'true' ||
          camp.is_smart_performance_campaign === 1 ||
          camp.objective_type === 'SMART_PERFORMANCE' ||
          camp.objective_type === 'PRODUCT_SALES' ||
          (camp.campaign_type && String(camp.campaign_type).toUpperCase().includes('SMART')) ||
          (camp.objective_type && String(camp.objective_type).toUpperCase().includes('SMART'))
        
        // DEBUG: Log para cada campanha
        console.log(`${camp.campaign_name} -> isSmartPlus: ${isSmartPlus}`)
        console.log(`  - is_smart_performance_campaign: ${camp.is_smart_performance_campaign} (${typeof camp.is_smart_performance_campaign})`)
        console.log(`  - objective_type: ${camp.objective_type}`)
        console.log(`  - campaign_type: ${camp.campaign_type}`)
        
        campaignMap.set(camp.campaign_id, {
          budget: budget,
          budget_mode: budgetMode,
          status: camp.operation_status || 'UNKNOWN',
          campaign_name: camp.campaign_name,
          is_smart_plus: isSmartPlus,
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

      const resultCampaign = {
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
        is_smart_plus: campaignInfo.is_smart_plus || false,
        conversions: parseFloat(metrics.conversion) || 0,
        cost_per_conversion: parseFloat(metrics.cost_per_conversion) || 0,
        conversion_rate: parseFloat(metrics.conversion_rate) || 0,
      }
      
      // DEBUG: Log campanha final
      console.log(`📊 Campanha final: ${resultCampaign.campanha}`)
      console.log(`  - campaign_id: ${campaignId}`)
      console.log(`  - is_smart_plus do campaignInfo: ${campaignInfo.is_smart_plus}`)
      console.log(`  - is_smart_plus final: ${resultCampaign.is_smart_plus}`)
      if (resultCampaign.is_smart_plus) {
        console.log(`✅ Smart Plus detectado: ${resultCampaign.campanha}`)
      }
      
      return resultCampaign
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
