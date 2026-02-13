import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveAdvertiserId, getTikTokAccessToken } from '@/lib/tiktok-accounts'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar access token e advertiser_id da conta ativa
    const accessToken = await getTikTokAccessToken(supabase, user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'TikTok não conectado' }, { status: 400 })
    }

    const advertiserId = await getActiveAdvertiserId(supabase, user.id)
    if (!advertiserId) {
      return NextResponse.json({ 
        error: 'Nenhuma conta TikTok configurada. Vá em Configurações para adicionar.' 
      }, { status: 400 })
    }

    const { startDate, endDate } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    // Buscar apenas campanhas do TikTok (orçamento e status)
    const campaignParams = new URLSearchParams({
      advertiser_id: advertiserId,
      fields: JSON.stringify([
        'campaign_id', 
        'campaign_name', 
        'budget', 
        'budget_mode', 
        'operation_status',
        'objective_type',
        'is_smart_performance_campaign'
      ]),
      page_size: '1000',
    })

    const campaignUrl = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?${campaignParams.toString()}`

    const response = await fetch(campaignUrl, {
      method: 'GET',
      headers: { 'Access-Token': accessToken },
    })

    const data = await response.json()

    if (data.code !== 0) {
      return NextResponse.json({ error: data.message || 'Erro ao buscar campanhas' }, { status: 500 })
    }

    // Mapear campanhas
    const campaigns = (data.data?.list || []).map((camp: any) => {
      const budget = parseFloat(camp.budget || '0') || 0
      
      return {
        campaign_id: camp.campaign_id,
        campaign_name: camp.campaign_name,
        orcamento_diario: budget,
        budget_mode: camp.budget_mode,
        status: camp.operation_status === 'ENABLE' ? 'ATIVO' : 'PAUSADO',
        is_smart_plus: camp.is_smart_performance_campaign === true || 
                       camp.objective_type === 'SMART_PERFORMANCE' ||
                       (camp.objective_type && String(camp.objective_type).toUpperCase().includes('SMART')),
      }
    })

    // Buscar imports do período para atualizar campanhas
    // Tentar com start_date/end_date primeiro, depois fallback para date
    let imports
    const { data: importsWithRange } = await supabase
      .from('imports')
      .select('id')
      .eq('user_id', user.id)
      .gte('start_date', startDate)
      .lte('end_date', endDate)

    if (importsWithRange && importsWithRange.length > 0) {
      imports = importsWithRange
    } else {
      // Fallback: usar coluna date se start_date/end_date não existirem
      const { data: importsWithDate } = await supabase
        .from('imports')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
      
      imports = importsWithDate
    }

    if (!imports || imports.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: 0,
        message: 'Nenhuma importação encontrada para o período',
      })
    }

    const importIds = imports.map(i => i.id)

    // Atualizar campanhas no banco (apenas campos de orçamento e status), filtradas por conta
    let updatedCount = 0
    for (const camp of campaigns) {
      let updateQuery = supabase
        .from('campaigns')
        .update({
          orcamento_diario: camp.orcamento_diario,
          status: camp.status,
          is_smart_plus: camp.is_smart_plus,
        })
        .eq('tiktok_campaign_id', camp.campaign_id)
        .in('import_id', importIds)
      if (advertiserId != null && advertiserId !== '') {
        updateQuery = updateQuery.eq('advertiser_id', advertiserId)
      }
      const { error } = await updateQuery

      if (!error) {
        updatedCount++
      }
    }

    console.log(`Sync rápido: ${updatedCount} campanhas atualizadas`)

    return NextResponse.json({
      success: true,
      campaigns: updatedCount,
      message: 'Campanhas sincronizadas',
    })

  } catch (error: any) {
    console.error('Erro sync rápido:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

