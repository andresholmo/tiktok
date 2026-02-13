import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveAdvertiserId } from '@/lib/tiktok-accounts'

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
  is_smart_plus?: boolean
  conversions?: number
  cost_per_conversion?: number
  conversion_rate?: number
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
  userId?: string  // Opcional para cron jobs
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
    
    // Obter userId da sessão OU do header (para cron)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const userIdFromHeader = request.headers.get('x-user-id')
    const userId = user?.id || userIdFromHeader
    
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data: SaveImportRequest = await request.json()
    const { startDate, endDate, tiktok, gam } = data
    
    // Usar userId do body se fornecido (para cron), senão usar da sessão
    const finalUserId = data.userId || userId

    // Advertiser: header/body (sync consolidado) ou conta ativa
    const headerAdvertiserId = request.headers.get('x-advertiser-id')
    const bodyAdvertiserId = (data as { advertiserId?: string }).advertiserId
    const advertiserId = headerAdvertiserId ?? bodyAdvertiserId ?? await getActiveAdvertiserId(supabase, finalUserId)

    // Calcular ROI geral
    const totalSpend = tiktok.totalSpend || 0
    // gam.totalRevenue = soma das campanhas rastreadas (GUP-01)
    // gam.faturamentoTotal = total por utm_source=tiktok (inclui não rastreado)
    const gamRevenue = gam.totalRevenue || 0  // Ganho Rastreado
    const gamFaturamentoTotal = gam.faturamentoTotal || 0  // Faturamento TikTok Total
    
    // ROI Rastreado (usando apenas campanhas rastreadas)
    const profitRastreado = gamRevenue - totalSpend
    const roiRastreado = totalSpend > 0 ? ((gamRevenue - totalSpend) / totalSpend) * 100 : 0
    
    // ROI Real (usando faturamento total)
    const profitReal = gamFaturamentoTotal - totalSpend
    const roiReal = totalSpend > 0 ? ((gamFaturamentoTotal - totalSpend) / totalSpend) * 100 : 0

    // Criar mapa de campanhas GAM por nome (normalizado)
    const gamMap = new Map<string, GAMCampaign>()
    for (const campaign of gam.campaigns) {
      // Normalizar nome da campanha (remover espaços, uppercase)
      const normalizedName = campaign.campanha.trim().toUpperCase()
      gamMap.set(normalizedName, campaign)
    }

    // Preparar dados das campanhas cruzando TikTok com GAM
    const campaignDataList: any[] = []

    // ========== DEBUG: Campanhas TikTok recebidas para salvar ==========
    console.log('=== DEBUG: Campanhas TikTok recebidas para salvar ===')
    console.log(`Total de campanhas: ${tiktok.campaigns.length}`)
    tiktok.campaigns.slice(0, 5).forEach((c: any) => {
      console.log(`${c.campanha || c.campaign_name}: is_smart_plus=${c.is_smart_plus} (tipo: ${typeof c.is_smart_plus})`)
    })

    // Processar campanhas do TikTok
    for (const tiktokCampaign of tiktok.campaigns) {
      const normalizedName = tiktokCampaign.campanha.trim().toUpperCase()
      const gamCampaign = gamMap.get(normalizedName)

      const tiktokSpend = tiktokCampaign.gasto || 0
      const gamRevenue = gamCampaign?.receita || 0
      const campaignProfit = gamRevenue - tiktokSpend
      const campaignRoi = tiktokSpend > 0 ? ((gamRevenue - tiktokSpend) / tiktokSpend) * 100 : null

      const isSmartPlusValue = Boolean(tiktokCampaign.is_smart_plus)
      
      // DEBUG: Log antes de salvar
      if (isSmartPlusValue) {
        console.log(`💾 Salvando Smart Plus: ${tiktokCampaign.campanha}, is_smart_plus=${isSmartPlusValue}`)
      }
      
      campaignDataList.push({
        advertiser_id: advertiserId ?? undefined,
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
        orcamento_diario: tiktokCampaign.orcamento_diario || 0,
        is_smart_plus: isSmartPlusValue,
        conversions: tiktokCampaign.conversions || 0,
        cost_per_conversion: tiktokCampaign.cost_per_conversion || 0,
        conversion_rate: tiktokCampaign.conversion_rate || 0,
      })

      // Remover do mapa para identificar campanhas GAM sem correspondência
      if (gamCampaign) {
        gamMap.delete(normalizedName)
      }
    }

    // Adicionar campanhas GAM que não têm correspondência no TikTok
    for (const [, gamCampaign] of gamMap) {
      campaignDataList.push({
        advertiser_id: advertiserId ?? undefined,
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
        orcamento_diario: 0, // Sem dados do TikTok
        is_smart_plus: false, // Campanhas GAM sem TikTok não são Smart Plus
      })
    }

    // Verificar se já existe importação para esse período e conta (advertiser_id)
    // Usar date (coluna antiga) se start_date/end_date não existirem
    let existingImport
    try {
      let query = supabase
        .from('imports')
        .select('id')
        .eq('user_id', finalUserId)
        .eq('start_date', startDate)
        .eq('end_date', endDate)
      if (advertiserId != null && advertiserId !== '') {
        query = query.eq('advertiser_id', advertiserId)
      } else {
        query = query.is('advertiser_id', null)
      }
      const { data, error } = await query.maybeSingle()
      
      if (error && error.message?.includes('column') && error.message?.includes('does not exist')) {
        // Se as colunas não existem, usar a coluna date antiga
        const { data: fallbackData } = await supabase
          .from('imports')
          .select('id')
          .eq('user_id', finalUserId)
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
        .eq('user_id', finalUserId)
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
        roi_geral: roiRastreado, // ROI Rastreado
        roi_real: roiReal, // ROI Real
        profit: profitRastreado, // Lucro Rastreado
        lucro_real: profitReal, // Lucro Real
        total_gasto: totalSpend, // Compatibilidade
        total_ganho: gamRevenue, // Ganho Rastreado (soma das campanhas)
        total_lucro: profitRastreado, // Lucro Rastreado
        faturamento_tiktok: gamFaturamentoTotal, // Faturamento TikTok Total
      }

      // Adicionar colunas novas apenas se existirem (será ignorado se não existir)
      try {
        updateData.advertiser_id = advertiserId ?? null
        updateData.start_date = startDate
        updateData.end_date = endDate
        updateData.tiktok_spend = totalSpend
        updateData.tiktok_impressions = tiktok.totalImpressions || 0
        updateData.tiktok_clicks = tiktok.totalClicks || 0
        updateData.gam_revenue = gamRevenue
        updateData.gam_faturamento_total = gamFaturamentoTotal
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
              roi_geral: roiRastreado,
              roi_real: roiReal,
              profit: profitRastreado,
              lucro_real: profitReal,
              total_gasto: totalSpend,
              total_ganho: gamRevenue,
              total_lucro: profitRastreado,
              faturamento_tiktok: gamFaturamentoTotal,
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
        user_id: finalUserId,
        roi_geral: roiRastreado, // ROI Rastreado
        roi_real: roiReal, // ROI Real
        profit: profitRastreado, // Lucro Rastreado
        lucro_real: profitReal, // Lucro Real
        total_gasto: totalSpend, // Compatibilidade
        total_ganho: gamRevenue, // Ganho Rastreado (soma das campanhas)
        total_lucro: profitRastreado, // Lucro Rastreado
        faturamento_tiktok: gamFaturamentoTotal, // Faturamento TikTok Total
      }

      // Adicionar colunas novas se existirem
      try {
        insertData.advertiser_id = advertiserId ?? null
        insertData.start_date = startDate
        insertData.end_date = endDate
        insertData.tiktok_spend = totalSpend
        insertData.tiktok_impressions = tiktok.totalImpressions || 0
        insertData.tiktok_clicks = tiktok.totalClicks || 0
        insertData.gam_revenue = gamRevenue
        insertData.gam_faturamento_total = gamFaturamentoTotal
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
              user_id: finalUserId,
              roi_geral: roiRastreado,
              roi_real: roiReal,
              profit: profitRastreado,
              lucro_real: profitReal,
              total_gasto: totalSpend,
              total_ganho: gamRevenue,
              total_lucro: profitRastreado,
              faturamento_tiktok: gamFaturamentoTotal,
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

    console.log(`Importação salva: ${campaignDataList.length} campanhas`)
    console.log('Valores:', {
      tiktokSpend: totalSpend,
      gamRevenue: gamRevenue, // Ganho Rastreado
      gamFaturamentoTotal: gamFaturamentoTotal, // Faturamento Total
      profitRastreado: profitRastreado,
      roiRastreado: roiRastreado,
      profitReal: profitReal,
      roiReal: roiReal,
    })

    // Registrar horário da sincronização
    const syncType = request.headers.get('x-sync-type') || 'manual'
    
    try {
      await supabase
        .from('sync_status')
        .upsert({
          user_id: finalUserId,
          last_sync_at: new Date().toISOString(),
          sync_type: syncType,
          status: 'success',
          details: {
            tiktokCampaigns: campaignDataList.length,
            gamRevenue: gamRevenue,
            roi: roiRastreado,
          },
        }, {
          onConflict: 'user_id',
        })
      
      console.log('Sync status atualizado')
    } catch (syncError) {
      // Não falhar a requisição se o sync_status falhar
      console.error('Erro ao atualizar sync status:', syncError)
    }

    return NextResponse.json({
      success: true,
      import: importRecord,
      summary: {
        totalCampaigns: campaignDataList.length,
        tiktokSpend: totalSpend || 0,
        gamRevenue: gamRevenue || 0, // Ganho Rastreado
        gamFaturamentoTotal: gamFaturamentoTotal || 0, // Faturamento Total
        profitRastreado: profitRastreado || 0,
        roiRastreado: roiRastreado || 0,
        profitReal: profitReal || 0,
        roiReal: roiReal || 0,
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

