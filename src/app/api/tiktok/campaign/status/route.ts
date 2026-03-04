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

    const { campaignIds, status } = await request.json()

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return NextResponse.json({ error: 'IDs de campanha obrigatórios' }, { status: 400 })
    }

    if (!status || !['ENABLE', 'DISABLE'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const accessToken = await getTikTokAccessToken(supabase, user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'Nenhuma conta TikTok conectada' }, { status: 400 })
    }

    // Buscar contas do usuário (para validar advertiser_id)
    const { data: accounts } = await supabase
      .from('tiktok_accounts')
      .select('advertiser_id')
      .eq('user_id', user.id)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'Nenhuma conta TikTok conectada' }, { status: 400 })
    }

    const accountIds = new Set((accounts || []).map((a) => a.advertiser_id).filter(Boolean))

    // Buscar o advertiser_id de cada campanha no banco
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('tiktok_campaign_id, advertiser_id')
      .in('tiktok_campaign_id', campaignIds)

    // Agrupar campanhas por advertiser_id
    const campaignsByAdvertiser = new Map<string, string[]>()

    for (const campaignId of campaignIds) {
      const campaign = campaigns?.find((c) => c.tiktok_campaign_id === campaignId)
      const advertiserId = campaign?.advertiser_id

      if (advertiserId && accountIds.has(advertiserId)) {
        if (!campaignsByAdvertiser.has(advertiserId)) {
          campaignsByAdvertiser.set(advertiserId, [])
        }
        campaignsByAdvertiser.get(advertiserId)!.push(campaignId)
      } else if (!advertiserId) {
        console.warn(`Campanha ${campaignId} não tem advertiser_id no banco`)
      }
    }

    if (campaignsByAdvertiser.size === 0) {
      return NextResponse.json({
        error: 'Nenhuma campanha encontrada com advertiser_id válido. Sincronize os dados primeiro.',
      }, { status: 400 })
    }

    const results: { advertiserId: string; campaignIds: string[]; success: boolean }[] = []
    const errors: { advertiserId: string; campaignIds: string[]; error: string; code?: number }[] = []

    for (const [advertiserId, campaignIdsForAccount] of campaignsByAdvertiser) {
      try {
        const response = await fetch(
          'https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Access-Token': accessToken,
            },
            body: JSON.stringify({
              advertiser_id: advertiserId,
              campaign_ids: campaignIdsForAccount,
              operation_status: status,
            }),
          }
        )

        const data = await response.json()

        if (data.code === 0) {
          results.push({
            advertiserId,
            campaignIds: campaignIdsForAccount,
            success: true,
          })
        } else {
          errors.push({
            advertiserId,
            campaignIds: campaignIdsForAccount,
            error: data.message,
            code: data.code,
          })
        }
      } catch (err: unknown) {
        errors.push({
          advertiserId,
          campaignIds: campaignIdsForAccount,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json({
        success: false,
        error: errors[0].error,
        errors,
      }, { status: 400 })
    }

    if (errors.length > 0 && results.length > 0) {
      return NextResponse.json({
        success: true,
        partial: true,
        message: `${results.length} conta(s) atualizadas com sucesso, ${errors.length} erro(s)`,
        results,
        errors,
      })
    }

    return NextResponse.json({
      success: true,
      message: `${campaignIds.length} campanha(s) atualizada(s)`,
      results,
    })
  } catch (error: unknown) {
    console.error('Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar status' },
      { status: 500 }
    )
  }
}
