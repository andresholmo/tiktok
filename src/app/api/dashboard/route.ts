import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    console.log('=== DASHBOARD: Buscando dados ===')
    console.log('User ID:', user.id)
    console.log('Período:', startDate, 'a', endDate)

    // Buscar TODOS os imports do usuário (SEM filtro de advertiser_id)
    const { data: imports, error: importsError } = await supabase
      .from('imports')
      .select('id, advertiser_id, start_date, end_date, tiktok_spend, total_gasto, gam_revenue, total_ganho, gam_faturamento_total, faturamento_tiktok, tiktok_impressions, tiktok_clicks, gam_impressions, gam_clicks')
      .eq('user_id', user.id)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date', { ascending: false })

    if (importsError) {
      console.error('Erro ao buscar imports:', importsError)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    console.log('Imports encontrados:', imports?.length || 0)
    const uniqueAdvertiserIds = [...new Set((imports || []).map(i => i.advertiser_id).filter(Boolean))]
    console.log('Advertiser IDs únicos nos imports:', uniqueAdvertiserIds.length, uniqueAdvertiserIds.slice(0, 5))

    if (!imports || imports.length === 0) {
      return NextResponse.json({
        success: true,
        period: { startDate, endDate },
        totals: {
          tiktokSpend: 0,
          gamRevenue: 0,
          gamFaturamentoTotal: 0,
          tiktokImpressions: 0,
          tiktokClicks: 0,
          gamImpressions: 0,
          gamClicks: 0,
          lucroRastreado: 0,
          roiRastreado: 0,
          lucroReal: 0,
          roiReal: 0,
        },
        campaigns: [],
        importsCount: 0,
      })
    }

    const importIds = imports.map(i => i.id)
    console.log('Total de import IDs:', importIds.length)

    // Buscar TODAS as campanhas de TODOS os imports (todas as contas)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*, is_smart_plus')
      .in('import_id', importIds)

    console.log('Campanhas encontradas no banco:', campaigns?.length || 0)
    if (campaignsError) {
      console.error('Erro ao buscar campanhas:', campaignsError)
      return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 })
    }

    // Agregar totais do período
    const totals = {
      tiktokSpend: 0,
      gamRevenue: 0,
      gamFaturamentoTotal: 0,
      tiktokImpressions: 0,
      tiktokClicks: 0,
      gamImpressions: 0,
      gamClicks: 0,
    }

    for (const imp of imports) {
      totals.tiktokSpend += Number(imp.tiktok_spend ?? imp.total_gasto ?? 0)
      totals.gamRevenue += Number(imp.gam_revenue ?? imp.total_ganho ?? 0)
      totals.tiktokImpressions += Number(imp.tiktok_impressions ?? 0)
      totals.tiktokClicks += Number(imp.tiktok_clicks ?? 0)
      totals.gamImpressions += Number(imp.gam_impressions ?? 0)
      totals.gamClicks += Number(imp.gam_clicks ?? 0)
    }

    // Faturamento GAM é um valor por período (mesmo para todas as contas) — usar o primeiro import
    const gamFaturamentoTotal = imports.length > 0
      ? Number(imports[0].gam_faturamento_total ?? imports[0].faturamento_tiktok ?? 0)
      : 0
    totals.gamFaturamentoTotal = gamFaturamentoTotal

    // Calcular métricas
    const lucroRastreado = totals.gamRevenue - totals.tiktokSpend
    const roiRastreado = totals.tiktokSpend > 0
      ? ((totals.gamRevenue - totals.tiktokSpend) / totals.tiktokSpend) * 100
      : 0

    const lucroReal = gamFaturamentoTotal - totals.tiktokSpend
    const roiReal = totals.tiktokSpend > 0
      ? ((gamFaturamentoTotal - totals.tiktokSpend) / totals.tiktokSpend) * 100
      : 0

    // Agregar por (nome + advertiser_id) para manter campanhas de contas diferentes separadas
    const campaignMap = new Map<string, any>()
    
    for (const camp of campaigns || []) {
      const name = camp.campaign_name || camp.campanha
      if (!name) continue
      const aggKey = `${name}__${camp.advertiser_id ?? ''}`
      
      if (campaignMap.has(aggKey)) {
        const existing = campaignMap.get(aggKey)
        existing.tiktok_spend = (existing.tiktok_spend || 0) + (Number(camp.tiktok_spend ?? camp.gasto ?? 0) || 0)
        existing.gam_revenue = (existing.gam_revenue || 0) + (Number(camp.gam_revenue ?? camp.ganho ?? 0) || 0)
        existing.tiktok_impressions = (existing.tiktok_impressions || 0) + (Number(camp.tiktok_impressions ?? 0) || 0)
        existing.tiktok_clicks = (existing.tiktok_clicks || 0) + (Number(camp.tiktok_clicks ?? 0) || 0)
        existing.gam_impressions = (existing.gam_impressions || 0) + (Number(camp.gam_impressions ?? 0) || 0)
        existing.gam_clicks = (existing.gam_clicks || 0) + (Number(camp.gam_clicks ?? 0) || 0)
        existing.conversions = (existing.conversions || 0) + (Number(camp.conversions ?? 0) || 0)
        if (!existing.advertiser_id && camp.advertiser_id) {
          existing.advertiser_id = camp.advertiser_id
        }
        if (!existing.is_smart_plus && camp.is_smart_plus) {
          existing.is_smart_plus = camp.is_smart_plus
        }
        // Usar último valor de cost_per_conversion e conversion_rate
        if (camp.cost_per_conversion !== undefined && camp.cost_per_conversion !== null) {
          existing.cost_per_conversion = camp.cost_per_conversion
        }
        if (camp.conversion_rate !== undefined && camp.conversion_rate !== null) {
          existing.conversion_rate = camp.conversion_rate
        }
      } else {
        campaignMap.set(aggKey, { 
          ...camp,
          campanha: name,
          is_smart_plus: Boolean(camp.is_smart_plus),
        })
      }
    }

    // Recalcular métricas das campanhas agregadas
    const aggregatedCampaigns = Array.from(campaignMap.values()).map(camp => {
      const gasto = Number(camp.tiktok_spend ?? camp.gasto ?? 0) || 0
      const ganho = Number(camp.gam_revenue ?? camp.ganho ?? 0) || 0
      const lucro = ganho - gasto
      const roi = gasto > 0 ? ((ganho - gasto) / gasto) * 100 : null
      
      const tiktokImpressions = Number(camp.tiktok_impressions ?? 0) || 0
      const tiktokClicks = Number(camp.tiktok_clicks ?? 0) || 0
      const gamImpressions = Number(camp.gam_impressions ?? 0) || 0
      
      const ctr = tiktokImpressions > 0 
        ? (tiktokClicks / tiktokImpressions) * 100 
        : (Number(camp.tiktok_ctr ?? camp.ctr ?? 0) || 0)
      
      const cpc = tiktokClicks > 0 
        ? gasto / tiktokClicks 
        : (Number(camp.tiktok_cpc ?? camp.cpc ?? 0) || 0)
      
      const ecpm = gamImpressions > 0 
        ? (ganho / gamImpressions) * 1000 
        : (Number(camp.gam_ecpm ?? camp.ecpm ?? 0) || 0)

      return {
        ...camp,
        gasto,
        ganho,
        lucro_prejuizo: lucro,
        lucro,
        roi,
        ctr,
        cpc,
        ecpm,
        conversions: Number(camp.conversions ?? 0) || 0,
        cost_per_conversion: Number(camp.cost_per_conversion ?? 0) || 0,
        conversion_rate: Number(camp.conversion_rate ?? 0) || 0,
        status: camp.tiktok_status || camp.status || (gasto > 0 ? 'ATIVO' : 'SEM DADOS'),
        is_smart_plus: Boolean(camp.is_smart_plus), // Garantir que existe
      }
    })

    // Filtrar campanhas SEM DADOS
    const validCampaigns = aggregatedCampaigns
      .filter(c => c.status !== 'SEM DADOS')
      .map(c => ({
        ...c,
        campanha: c.campaign_name || c.campanha,
        is_smart_plus: Boolean(c.is_smart_plus),
      }))

    console.log('Campanhas agregadas:', campaignMap.size)
    console.log('Campanhas após filtrar SEM DADOS:', validCampaigns.length)

    return NextResponse.json({
      success: true,
      period: { startDate, endDate },
      totals: {
        ...totals,
        lucroRastreado,
        roiRastreado,
        lucroReal,
        roiReal,
      },
      campaigns: validCampaigns,
      importsCount: imports.length,
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

