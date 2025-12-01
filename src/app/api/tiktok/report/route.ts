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

    const advertiserId = credentials.advertiser_id
    const accessToken = credentials.access_token

    // Usar endpoint de relatório com GET e query params (formato correto da API v1.3)
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['campaign_id']),
      metrics: JSON.stringify(['campaign_name', 'spend', 'cpc', 'ctr', 'impressions', 'clicks', 'budget']),
      start_date: startDate,
      end_date: endDate,
      page_size: '1000',
    })

    const apiUrl = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`

    console.log('=== CHAMANDO API RELATÓRIO TIKTOK ===')
    console.log('URL:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
      },
    })

    console.log('Status:', response.status)
    
    const responseText = await response.text()
    console.log('Resposta (500 chars):', responseText.substring(0, 500))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Erro ao parsear JSON')
      return NextResponse.json({ error: 'Resposta inválida do TikTok' }, { status: 500 })
    }

    console.log('Código TikTok:', data.code)

    if (data.code !== 0) {
      console.error('Erro TikTok:', data.message)
      
      if (data.code === 40100 || data.code === 40105) {
        await supabase.from('tiktok_credentials').delete().eq('user_id', user.id)
        return NextResponse.json({ error: 'Token expirado. Reconecte o TikTok.' }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: data.message || 'Erro do TikTok',
        code: data.code 
      }, { status: 500 })
    }

    const list = data.data?.list || []
    console.log('Campanhas encontradas:', list.length)

    const campaigns = list.map((item: any) => {
      const metrics = item.metrics || {}
      const dimensions = item.dimensions || {}
      
      return {
        campaign_id: dimensions.campaign_id || '',
        campanha: metrics.campaign_name || 'Sem nome',
        gasto: parseFloat(metrics.spend) || 0,
        cpc: parseFloat(metrics.cpc) || 0,
        ctr: parseFloat(metrics.ctr) || 0,
        impressoes: parseInt(metrics.impressions) || 0,
        cliques: parseInt(metrics.clicks) || 0,
        orcamento_diario: parseFloat(metrics.budget) || 0,
      }
    })

    // Filtrar campanhas com gasto > 0
    const campanhasComGasto = campaigns.filter((c: any) => c.gasto > 0)

    return NextResponse.json({
      success: true,
      campaigns: campanhasComGasto,
      total: campanhasComGasto.length,
      periodo: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('Erro geral:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
