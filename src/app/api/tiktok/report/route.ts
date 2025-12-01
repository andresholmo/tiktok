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

    // URL correta da API TikTok Marketing
    const apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/'
    
    const requestBody = {
      advertiser_id: credentials.advertiser_id,
      report_type: 'BASIC',
      dimensions: ['campaign_id'],
      data_level: 'AUCTION_CAMPAIGN',
      start_date: startDate,
      end_date: endDate,
      metrics: ['campaign_name', 'spend', 'cpc', 'ctr', 'impressions', 'clicks'],
      page_size: 1000,
    }

    console.log('Chamando API TikTok:', apiUrl)
    console.log('Body:', JSON.stringify(requestBody))
    console.log('Token (primeiros 20 chars):', credentials.access_token.substring(0, 20))

    const reportResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': credentials.access_token,
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Status:', reportResponse.status)
    console.log('Headers:', JSON.stringify(Object.fromEntries(reportResponse.headers.entries())))

    const responseText = await reportResponse.text()
    console.log('Response:', responseText.substring(0, 500))

    // Tentar parsear como JSON
    let reportData
    try {
      reportData = JSON.parse(responseText)
    } catch (e) {
      console.error('Não foi possível parsear resposta como JSON')
      return NextResponse.json({ error: 'Erro de comunicação com TikTok. Resposta inválida.' }, { status: 500 })
    }

    if (reportData.code !== 0) {
      console.error('Erro TikTok:', reportData)
      return NextResponse.json({ error: reportData.message || 'Erro do TikTok' }, { status: 500 })
    }

    if (!reportData.data?.list || reportData.data.list.length === 0) {
      return NextResponse.json({ success: true, campaigns: [], total: 0, message: 'Nenhuma campanha encontrada' })
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
