import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: credentials, error: credError } = await supabase
      .from('tiktok_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (credError || !credentials) {
      return NextResponse.json({ error: 'TikTok não conectado' }, { status: 400 })
    }

    if (!credentials.access_token || !credentials.advertiser_id) {
      return NextResponse.json({ error: 'Credenciais incompletas. Reconecte o TikTok.' }, { status: 400 })
    }

    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    const reportResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': credentials.access_token,
      },
      body: JSON.stringify({
        advertiser_id: credentials.advertiser_id,
        report_type: 'BASIC',
        dimensions: ['campaign_id'],
        data_level: 'AUCTION_CAMPAIGN',
        start_date: startDate,
        end_date: endDate,
        metrics: ['campaign_name', 'spend', 'cpc', 'ctr', 'impressions', 'clicks'],
        page_size: 1000,
      }),
    })

    const contentType = reportResponse.headers.get('content-type')
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await reportResponse.text()
      console.error('Resposta não-JSON:', text.substring(0, 200))
      return NextResponse.json({ error: 'Erro de comunicação com TikTok' }, { status: 500 })
    }

    const reportData = await reportResponse.json()

    if (reportData.code !== 0) {
      console.error('Erro TikTok:', reportData)
      return NextResponse.json({ error: reportData.message || 'Erro do TikTok' }, { status: 500 })
    }

    if (!reportData.data?.list || reportData.data.list.length === 0) {
      return NextResponse.json({ success: true, campaigns: [], total: 0 })
    }

    const campaigns = reportData.data.list
      .map((item: any) => ({
        campaign_id: item.dimensions?.campaign_id || '',
        campanha: item.metrics?.campaign_name || 'Sem nome',
        gasto: parseFloat(item.metrics?.spend) || 0,
        cpc: parseFloat(item.metrics?.cpc) || 0,
        ctr: parseFloat(item.metrics?.ctr) || 0,
        impressoes: parseInt(item.metrics?.impressions) || 0,
        cliques: parseInt(item.metrics?.clicks) || 0,
      }))
      .filter((c: any) => c.gasto > 0)

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
      periodo: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
