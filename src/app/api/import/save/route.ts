import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface TikTokCampaign {
  campaign_id: string
  campanha: string
  gasto: number
  impressoes: number
  cliques: number
  ctr: number
  cpc: number
  status?: string
  orcamento_diario?: number
}

interface GAMCampaign {
  campanha: string
  data: string
  receita: number
  impressoes: number
  cliques: number
  ctr: number
  ecpm: number
}

interface SaveImportRequest {
  startDate: string
  endDate: string
  tiktok: {
    campaigns: TikTokCampaign[]
    totalSpend: number
    totalImpressions: number
    totalClicks: number
  }
  gam: {
    campaigns: GAMCampaign[]
    totalRevenue: number
    faturamentoTotal: number
    totalImpressions: number
    totalClicks: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data: SaveImportRequest = await request.json()
    const { startDate, endDate, tiktok, gam } = data

    // Calcular ROI geral
    const totalSpend = tiktok.totalSpend || 0
    const totalRevenue = gam.faturamentoTotal || gam.totalRevenue || 0
    const profit = totalRevenue - totalSpend
    const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0

    // Criar mapa de campanhas GAM por nome (normalizado)
    const gamMap = new Map<string, GAMCampaign>()
    for (const campaign of gam.campaigns) {
      // Normalizar nome da campanha (remover espaços, uppercase)
      const normalizedName = campaign.campanha.trim().toUpperCase()
      gamMap.set(normalizedName, campaign)
    }

    // Preparar dados das campanhas cruzando TikTok com GAM
    const campaignDataList: any[] = []

    // Processar campanhas do TikTok
    for (const tiktokCampaign of tiktok.campaigns) {
      const normalizedName = tiktokCampaign.campanha.trim().toUpperCase()
      const gamCampaign = gamMap.get(normalizedName)

      const tiktokSpend = tiktokCampaign.gasto || 0
      const gamRevenue = gamCampaign?.receita || 0
      const campaignProfit = gamRevenue - tiktokSpend
      const campaignRoi = tiktokSpend > 0 ? ((gamRevenue - tiktokSpend) / tiktokSpend) * 100 : null

      campaignDataList.push({
        campaign_name: tiktokCampaign.campanha,
        campanha: tiktokCampaign.campanha, // Manter compatibilidade
        campaign_date: new Date(startDate).toISOString().split('T')[0],
        tiktok_campaign_id: tiktokCampaign.campaign_id || null,
        tiktok_spend: tiktokSpend,
        tiktok_impressions: tiktokCampaign.impressoes || 0,
        tiktok_clicks: tiktokCampaign.cliques || 0,
        tiktok_ctr: tiktokCampaign.ctr || 0,
        tiktok_cpc: tiktokCampaign.cpc || 0,
        gam_revenue: gamRevenue,
        gam_impressions: gamCampaign?.impressoes || 0,
        gam_clicks: gamCampaign?.cliques || 0,
        gam_ctr: gamCampaign?.ctr || 0,
        gam_ecpm: gamCampaign?.ecpm || 0,
        roi: campaignRoi,
        profit: campaignProfit,
        // Campos legados para compatibilidade
        gasto: tiktokSpend,
        ganho: gamRevenue,
        lucro_prejuizo: campaignProfit,
        status: tiktokCampaign.status || 'SEM DADOS',
        cpc: tiktokCampaign.cpc || 0,
        ctr: tiktokCampaign.ctr || 0,
        ecpm: gamCampaign?.ecpm || 0,
      })

      // Remover do mapa para identificar campanhas GAM sem correspondência
      if (gamCampaign) {
        gamMap.delete(normalizedName)
      }
    }

    // Adicionar campanhas GAM que não têm correspondência no TikTok
    for (const [, gamCampaign] of gamMap) {
      campaignDataList.push({
        campaign_name: gamCampaign.campanha,
        campanha: gamCampaign.campanha, // Manter compatibilidade
        campaign_date: new Date(startDate).toISOString().split('T')[0],
        tiktok_campaign_id: null,
        tiktok_spend: 0,
        tiktok_impressions: 0,
        tiktok_clicks: 0,
        tiktok_ctr: 0,
        tiktok_cpc: 0,
        gam_revenue: gamCampaign.receita,
        gam_impressions: gamCampaign.impressoes || 0,
        gam_clicks: gamCampaign.cliques || 0,
        gam_ctr: gamCampaign.ctr || 0,
        gam_ecpm: gamCampaign.ecpm || 0,
        roi: null, // Sem gasto, não há ROI
        profit: gamCampaign.receita,
        // Campos legados para compatibilidade
        gasto: 0,
        ganho: gamCampaign.receita,
        lucro_prejuizo: gamCampaign.receita,
        status: 'SEM DADOS',
        cpc: 0,
        ctr: 0,
        ecpm: gamCampaign.ecpm || 0,
      })
    }

    // Verificar se já existe importação para esse período
    const { data: existingImport } = await supabase
      .from('imports')
      .select('id')
      .eq('user_id', user.id)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .maybeSingle()

    let importRecord

    if (existingImport) {
      // Deletar campanhas antigas
      await supabase
        .from('campaigns')
        .delete()
        .eq('import_id', existingImport.id)

      // Atualizar importação existente
      const { data: updatedImport, error: updateError } = await supabase
        .from('imports')
        .update({
          date: startDate, // Manter compatibilidade
          created_at: new Date().toISOString(),
          start_date: startDate,
          end_date: endDate,
          tiktok_spend: totalSpend,
          tiktok_impressions: tiktok.totalImpressions || 0,
          tiktok_clicks: tiktok.totalClicks || 0,
          gam_revenue: gam.totalRevenue || 0,
          gam_faturamento_total: gam.faturamentoTotal || 0,
          gam_impressions: gam.totalImpressions || 0,
          gam_clicks: gam.totalClicks || 0,
          roi_geral: roi,
          roi_real: roi, // Compatibilidade
          profit: profit,
          lucro_real: profit, // Compatibilidade
          total_gasto: totalSpend, // Compatibilidade
          total_ganho: totalRevenue, // Compatibilidade
          total_lucro: profit, // Compatibilidade
          faturamento_tiktok: gam.faturamentoTotal || 0, // Compatibilidade
        })
        .eq('id', existingImport.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      importRecord = updatedImport
    } else {
      // Criar nova importação
      const { data: newImport, error: insertError } = await supabase
        .from('imports')
        .insert({
          date: startDate, // Manter compatibilidade
          user_id: user.id,
          start_date: startDate,
          end_date: endDate,
          tiktok_spend: totalSpend,
          tiktok_impressions: tiktok.totalImpressions || 0,
          tiktok_clicks: tiktok.totalClicks || 0,
          gam_revenue: gam.totalRevenue || 0,
          gam_faturamento_total: gam.faturamentoTotal || 0,
          gam_impressions: gam.totalImpressions || 0,
          gam_clicks: gam.totalClicks || 0,
          roi_geral: roi,
          roi_real: roi, // Compatibilidade
          profit: profit,
          lucro_real: profit, // Compatibilidade
          total_gasto: totalSpend, // Compatibilidade
          total_ganho: totalRevenue, // Compatibilidade
          total_lucro: profit, // Compatibilidade
          faturamento_tiktok: gam.faturamentoTotal || 0, // Compatibilidade
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      importRecord = newImport
    }

    // Inserir campanhas
    const campaignsToInsert = campaignDataList.map(c => ({
      ...c,
      import_id: importRecord.id,
    }))

    const { error: campaignsError } = await supabase
      .from('campaigns')
      .insert(campaignsToInsert)

    if (campaignsError) {
      console.error('Erro ao inserir campanhas:', campaignsError)
      throw campaignsError
    }

    console.log(`Importação salva: ${campaignDataList.length} campanhas, ROI: ${roi.toFixed(2)}%`)

    return NextResponse.json({
      success: true,
      import: importRecord,
      summary: {
        totalCampaigns: campaignDataList.length,
        tiktokSpend: totalSpend,
        gamRevenue: totalRevenue,
        profit,
        roi,
      },
    })

  } catch (error) {
    console.error('Erro ao salvar importação:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar importação', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

