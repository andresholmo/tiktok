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
    const { data: credentials, error: credError } = await supabase
      .from('tiktok_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (credError || !credentials) {
      return NextResponse.json({ error: 'TikTok não conectado. Por favor, conecte sua conta primeiro.' }, { status: 400 })
    }

    const { startDate, endDate } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas de início e fim são obrigatórias' }, { status: 400 })
    }

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
          'budget',
          'campaign_budget'
        ],
        page_size: 1000,
      }),
    })

    const reportData = await reportResponse.json()

    console.log('Resposta do relatório TikTok:', JSON.stringify(reportData, null, 2))

    if (reportData.code !== 0) {
      console.error('Erro ao buscar relatório:', reportData)
      
      // Verificar se é erro de token expirado
      if (reportData.code === 40105 || reportData.message?.includes('token')) {
        // Remover credenciais inválidas
        await supabase
          .from('tiktok_credentials')
          .delete()
          .eq('user_id', user.id)
        
        return NextResponse.json({ 
          error: 'Token do TikTok expirado. Por favor, reconecte sua conta.' 
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: reportData.message || 'Erro ao buscar relatório do TikTok' 
      }, { status: 500 })
    }

    // Verificar se há dados
    if (!reportData.data?.list || reportData.data.list.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        total: 0,
        message: 'Nenhuma campanha encontrada no período selecionado'
      })
    }

    // Transformar dados para o formato esperado
    const campaigns = reportData.data.list.map((item: any) => {
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
        orcamento_diario: parseFloat(metrics.budget || metrics.campaign_budget) || 0,
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

  } catch (error) {
    console.error('Erro ao buscar relatório:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
