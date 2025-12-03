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
    // Usar date (coluna antiga) se start_date/end_date não existirem
    let existingImport
    try {
      const { data, error } = await supabase
        .from('imports')
        .select('id')
        .eq('user_id', user.id)
        .eq('start_date', startDate)
        .eq('end_date', endDate)
        .maybeSingle()
      
      if (error && error.message?.includes('column') && error.message?.includes('does not exist')) {
        // Se as colunas não existem, usar a coluna date antiga
        const { data: fallbackData } = await supabase
          .from('imports')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', startDate)
          .maybeSingle()
        existingImport = fallbackData
      } else {
        existingImport = data
      }
    } catch (e) {
      // Fallback: usar coluna date
      const { data } = await supabase
        .from('imports')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', startDate)
        .maybeSingle()
      existingImport = data
    }

    let importRecord

    if (existingImport) {
      // Deletar campanhas antigas
      await supabase
        .from('campaigns')
        .delete()
        .eq('import_id', existingImport.id)

      // Atualizar importação existente
      // Construir objeto de update dinamicamente para evitar erros com colunas inexistentes
      const updateData: any = {
        date: startDate, // Manter compatibilidade
        created_at: new Date().toISOString(),
        roi_geral: roi,
        roi_real: roi, // Compatibilidade
        profit: profit,
        lucro_real: profit, // Compatibilidade
        total_gasto: totalSpend, // Compatibilidade
        total_ganho: totalRevenue, // Compatibilidade
        total_lucro: profit, // Compatibilidade
        faturamento_tiktok: gam.faturamentoTotal || 0, // Compatibilidade
      }

      // Adicionar colunas novas apenas se existirem (será ignorado se não existir)
      try {
        updateData.start_date = startDate
        updateData.end_date = endDate
        updateData.tiktok_spend = totalSpend
        updateData.tiktok_impressions = tiktok.totalImpressions || 0
        updateData.tiktok_clicks = tiktok.totalClicks || 0
        updateData.gam_revenue = gam.totalRevenue || 0
        updateData.gam_faturamento_total = gam.faturamentoTotal || 0
        updateData.gam_impressions = gam.totalImpressions || 0
        updateData.gam_clicks = gam.totalClicks || 0
      } catch (e) {
        // Ignorar se colunas não existirem
      }

      const { data: updatedImport, error: updateError } = await supabase
        .from('imports')
        .update(updateData)
        .eq('id', existingImport.id)
        .select()
        .single()

      if (updateError) {
        // Se erro for por coluna inexistente, tentar sem as colunas novas
        if (updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
          const { data: fallbackImport, error: fallbackError } = await supabase
            .from('imports')
            .update({
              date: startDate,
              created_at: new Date().toISOString(),
              roi_geral: roi,
              roi_real: roi,
              profit: profit,
              lucro_real: profit,
              total_gasto: totalSpend,
              total_ganho: totalRevenue,
              total_lucro: profit,
              faturamento_tiktok: gam.faturamentoTotal || 0,
            })
            .eq('id', existingImport.id)
            .select()
            .single()
          
          if (fallbackError) {
            throw new Error(`Erro ao atualizar importação. Execute a migração SQL primeiro: ${fallbackError.message}`)
          }
          importRecord = fallbackImport
        } else {
          throw updateError
        }
      } else {
        importRecord = updatedImport
      }

      importRecord = updatedImport
    } else {
      // Criar nova importação
      const insertData: any = {
        date: startDate, // Manter compatibilidade
        user_id: user.id,
        roi_geral: roi,
        roi_real: roi, // Compatibilidade
        profit: profit,
        lucro_real: profit, // Compatibilidade
        total_gasto: totalSpend, // Compatibilidade
        total_ganho: totalRevenue, // Compatibilidade
        total_lucro: profit, // Compatibilidade
        faturamento_tiktok: gam.faturamentoTotal || 0, // Compatibilidade
      }

      // Adicionar colunas novas se existirem
      try {
        insertData.start_date = startDate
        insertData.end_date = endDate
        insertData.tiktok_spend = totalSpend
        insertData.tiktok_impressions = tiktok.totalImpressions || 0
        insertData.tiktok_clicks = tiktok.totalClicks || 0
        insertData.gam_revenue = gam.totalRevenue || 0
        insertData.gam_faturamento_total = gam.faturamentoTotal || 0
        insertData.gam_impressions = gam.totalImpressions || 0
        insertData.gam_clicks = gam.totalClicks || 0
      } catch (e) {
        // Ignorar
      }

      const { data: newImport, error: insertError } = await supabase
        .from('imports')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        // Se erro for por coluna inexistente, tentar sem as colunas novas
        if (insertError.message?.includes('column') && insertError.message?.includes('does not exist')) {
          const { data: fallbackImport, error: fallbackError } = await supabase
            .from('imports')
            .insert({
              date: startDate,
              user_id: user.id,
              roi_geral: roi,
              roi_real: roi,
              profit: profit,
              lucro_real: profit,
              total_gasto: totalSpend,
              total_ganho: totalRevenue,
              total_lucro: profit,
              faturamento_tiktok: gam.faturamentoTotal || 0,
            })
            .select()
            .single()
          
          if (fallbackError) {
            throw new Error(`Erro ao criar importação. Execute a migração SQL primeiro: ${fallbackError.message}`)
          }
          importRecord = fallbackImport
        } else {
          throw insertError
        }
      } else {
        importRecord = newImport
      }
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

    console.log(`Importação salva: ${campaignDataList.length} campanhas, ROI: ${(roi ?? 0).toFixed(2)}%`)

    return NextResponse.json({
      success: true,
      import: importRecord,
      summary: {
        totalCampaigns: campaignDataList.length,
        tiktokSpend: totalSpend || 0,
        gamRevenue: totalRevenue || 0,
        profit: profit || 0,
        roi: roi || 0,
      },
    })

  } catch (error) {
    console.error('Erro ao salvar importação:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Verificar se é erro de coluna inexistente
    if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Colunas do banco de dados não encontradas',
          details: 'Execute a migração SQL em src/lib/supabase/migration_import_consolidada_completa.sql no Supabase SQL Editor',
          migrationFile: 'src/lib/supabase/migration_import_consolidada_completa.sql'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro ao salvar importação', details: errorMessage },
      { status: 500 }
    )
  }
}

