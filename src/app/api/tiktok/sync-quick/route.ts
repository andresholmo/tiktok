import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTikTokAccessToken } from '@/lib/tiktok-accounts'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const accessToken = await getTikTokAccessToken(supabase, user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'TikTok não conectado' }, { status: 400 })
    }

    // Todas as contas TikTok do usuário
    const { data: accounts } = await supabase
      .from('tiktok_accounts')
      .select('id, advertiser_id, name')
      .eq('user_id', user.id)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'Nenhuma conta TikTok configurada' }, { status: 400 })
    }

    const { startDate, endDate } = await request.json()
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    let imports: { id: string }[] | null
    const { data: importsWithRange } = await supabase
      .from('imports')
      .select('id')
      .eq('user_id', user.id)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
    if (importsWithRange?.length) {
      imports = importsWithRange
    } else {
      const { data: importsWithDate } = await supabase
        .from('imports')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
      imports = importsWithDate
    }
    const importIds = imports?.length ? imports.map(i => i.id) : []

    let totalUpdated = 0

    for (const account of accounts) {
      const advertiserId = account.advertiser_id
      if (!advertiserId) continue

      const campaignParams = new URLSearchParams({
        advertiser_id: advertiserId,
        fields: JSON.stringify([
          'campaign_id', 'campaign_name', 'budget', 'budget_mode', 'operation_status',
          'objective_type', 'is_smart_performance_campaign',
        ]),
        page_size: '1000',
      })
      const campaignUrl = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?${campaignParams.toString()}`
      const response = await fetch(campaignUrl, {
        method: 'GET',
        headers: { 'Access-Token': accessToken },
      })
      const data = await response.json()
      if (data.code !== 0) continue

      const campaigns = (data.data?.list || []).map((camp: any) => ({
        campaign_id: camp.campaign_id,
        orcamento_diario: parseFloat(camp.budget || '0') || 0,
        status: camp.operation_status === 'ENABLE' ? 'ATIVO' : 'PAUSADO',
        is_smart_plus: camp.is_smart_performance_campaign === true ||
          camp.objective_type === 'SMART_PERFORMANCE' ||
          (camp.objective_type && String(camp.objective_type).toUpperCase().includes('SMART')),
      }))

      for (const camp of campaigns) {
        let q = supabase
          .from('campaigns')
          .update({
            orcamento_diario: camp.orcamento_diario,
            status: camp.status,
            is_smart_plus: camp.is_smart_plus,
          })
          .eq('tiktok_campaign_id', camp.campaign_id)
          .eq('advertiser_id', advertiserId)
        if (importIds.length) {
          q = q.in('import_id', importIds)
        }
        const { error } = await q
        if (!error) totalUpdated++
      }
    }

    console.log(`Sync rápido: ${totalUpdated} campanhas de ${accounts.length} conta(s)`)

    return NextResponse.json({
      success: true,
      campaigns: totalUpdated,
      accounts: accounts.length,
      message: 'Campanhas sincronizadas',
    })
  } catch (error: any) {
    console.error('Erro sync rápido:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

