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

    // Buscar importações do período
    const { data: imports, error: importsError } = await supabase
      .from('imports')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date', { ascending: false })

    if (importsError) {
      console.error('Erro ao buscar imports:', importsError)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

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

    // Buscar campanhas do período
    const importIds = imports.map(i => i.id)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .in('import_id', importIds)

    if (campaignsError) {
      console.error('Erro ao buscar campanhas:', campaignsError)
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
      totals.gamFaturamentoTotal += Number(imp.gam_faturamento_total ?? imp.faturamento_tiktok ?? 0)
      totals.tiktokImpressions += Number(imp.tiktok_impressions ?? 0)
      totals.tiktokClicks += Number(imp.tiktok_clicks ?? 0)
      totals.gamImpressions += Number(imp.gam_impressions ?? 0)
      totals.gamClicks += Number(imp.gam_clicks ?? 0)
    }

    // Calcular métricas
    const lucroRastreado = totals.gamRevenue - totals.tiktokSpend
    const roiRastreado = totals.tiktokSpend > 0 
      ? ((totals.gamRevenue - totals.tiktokSpend) / totals.tiktokSpend) * 100 
      : 0

    const lucroReal = totals.gamFaturamentoTotal - totals.tiktokSpend
    const roiReal = totals.tiktokSpend > 0 
      ? ((totals.gamFaturamentoTotal - totals.tiktokSpend) / totals.tiktokSpend) * 100 
      : 0

    // Agregar campanhas por nome (somar valores de múltiplos dias)
    const campaignMap = new Map<string, any>()
    
    for (const camp of campaigns || []) {
      const name = camp.campaign_name || camp.campanha
      if (!name) continue
      
      if (campaignMap.has(name)) {
        const existing = campaignMap.get(name)
        existing.tiktok_spend = (existing.tiktok_spend || 0) + (Number(camp.tiktok_spend ?? camp.gasto ?? 0) || 0)
        existing.gam_revenue = (existing.gam_revenue || 0) + (Number(camp.gam_revenue ?? camp.ganho ?? 0) || 0)
        existing.tiktok_impressions = (existing.tiktok_impressions || 0) + (Number(camp.tiktok_impressions ?? 0) || 0)
        existing.tiktok_clicks = (existing.tiktok_clicks || 0) + (Number(camp.tiktok_clicks ?? 0) || 0)
        existing.gam_impressions = (existing.gam_impressions || 0) + (Number(camp.gam_impressions ?? 0) || 0)
        existing.gam_clicks = (existing.gam_clicks || 0) + (Number(camp.gam_clicks ?? 0) || 0)
      } else {
        campaignMap.set(name, { 
          ...camp,
          campanha: name, // Garantir compatibilidade
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
        status: camp.tiktok_status || camp.status || (gasto > 0 ? 'ATIVO' : 'SEM DADOS'),
      }
    })

    // Filtrar campanhas SEM DADOS
    const validCampaigns = aggregatedCampaigns.filter(c => c.status !== 'SEM DADOS')

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

