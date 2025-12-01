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

    // Buscar credenciais do TikTok
    const { data: credentials } = await supabase
      .from('tiktok_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!credentials) {
      return NextResponse.json({ error: 'TikTok não conectado' }, { status: 400 })
    }

    const { startDate, endDate } = await request.json()

    // Buscar relatório de campanhas
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
        metrics: [
          'campaign_name',
          'spend',
          'cpc',
          'ctr',
          'impressions',
          'clicks',
          'budget'
        ],
        page_size: 1000,
      }),
    })

    const reportData = await reportResponse.json()

    if (reportData.code !== 0) {
      console.error('Erro ao buscar relatório:', reportData)
      return NextResponse.json({ error: 'Erro ao buscar relatório do TikTok' }, { status: 500 })
    }

    // Transformar dados para o formato esperado
    const campaigns = reportData.data.list.map((item: any) => ({
      campanha: item.metrics.campaign_name,
      status: 'ATIVO', // API não retorna status diretamente
      gasto: parseFloat(item.metrics.spend) || 0,
      cpc: parseFloat(item.metrics.cpc) || 0,
      ctr: parseFloat(item.metrics.ctr) || 0,
      orcamento_diario: parseFloat(item.metrics.budget) || 0,
      impressoes: parseInt(item.metrics.impressions) || 0,
      cliques: parseInt(item.metrics.clicks) || 0,
    }))

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
    })

  } catch (error) {
    console.error('Erro ao buscar relatório:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

