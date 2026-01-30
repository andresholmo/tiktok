import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveAdvertiserId, getTikTokAccessToken } from '@/lib/tiktok-accounts'

export const dynamic = 'force-dynamic'

interface UpdateStatusRequest {
  campaignIds: string[]
  status: 'ENABLE' | 'DISABLE'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { campaignIds, status }: UpdateStatusRequest = await request.json()

    if (!campaignIds || campaignIds.length === 0) {
      return NextResponse.json({ error: 'Nenhuma campanha selecionada' }, { status: 400 })
    }

    if (!['ENABLE', 'DISABLE'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
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

    // Chamar API do TikTok para atualizar status
    const response = await fetch(
      'https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/',
      {
        method: 'POST',
        headers: {
          'Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          campaign_ids: campaignIds,
          operation_status: status,
        }),
      }
    )

    const data = await response.json()

    if (data.code !== 0) {
      console.error('Erro TikTok API:', data)
      return NextResponse.json({ 
        error: data.message || 'Erro ao atualizar status',
        details: data 
      }, { status: 400 })
    }

    console.log(`Campanhas atualizadas para ${status}:`, campaignIds)

    return NextResponse.json({
      success: true,
      message: `${campaignIds.length} campanha(s) ${status === 'ENABLE' ? 'ativada(s)' : 'pausada(s)'}`,
      campaignIds,
      status,
    })

  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

