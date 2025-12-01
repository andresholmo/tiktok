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
      console.error('Credenciais não encontradas:', credError)
      return NextResponse.json({ 
        error: 'TikTok não conectado. Por favor, conecte sua conta primeiro.' 
      }, { status: 400 })
    }

    console.log('Credenciais encontradas:', {
      hasToken: !!credentials.access_token,
      advertiserId: credentials.advertiser_id,
    })

    if (!credentials.access_token) {
      return NextResponse.json({ 
        error: 'Token do TikTok não encontrado. Reconecte sua conta.' 
      }, { status: 400 })
    }

    if (!credentials.advertiser_id) {
      return NextResponse.json({ 
        error: 'ID do anunciante não encontrado. Reconecte sua conta.' 
      }, { status: 400 })
    }

    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Datas de início e fim são obrigatórias' 
      }, { status: 400 })
    }

    console.log('Buscando relatório:', { startDate, endDate, advertiserId: credentials.advertiser_id })

    // Buscar relatório de campanhas
    const reportUrl = 'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/'
    
    const requestBody = {
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
        'clicks'
      ],
      page_size: 1000,
    }

    console.log('Request para TikTok:', JSON.stringify(requestBody, null, 2))

    const reportResponse = await fetch(reportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': credentials.access_token,
      },
      body: JSON.stringify(requestBody),
    })

    // Verificar se a resposta é JSON
    const contentType = reportResponse.headers.get('content-type')
    console.log('Content-Type da resposta:', contentType)
    console.log('Status da resposta:', reportResponse.status)

    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await reportResponse.text()
      console.error('Resposta não é JSON:', textResponse.substring(0, 500))
      
      // Pode ser erro de autenticação
      if (reportResponse.status === 401 || textResponse.includes('unauthorized')) {
        // Remover credenciais inválidas
        await supabase
          .from('tiktok_credentials')
          .delete()
          .eq('user_id', user.id)
        
        return NextResponse.json({ 
          error: 'Sessão do TikTok expirada. Por favor, reconecte sua conta.' 
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Erro na comunicação com TikTok. Tente novamente.' 
      }, { status: 500 })
    }

    const reportData = await reportResponse.json()

    console.log('Resposta do TikTok:', JSON.stringify(reportData, null, 2))

    // Verificar código de erro do TikTok
    if (reportData.code !== 0) {
      console.error('Erro da API TikTok:', reportData)
      
      // Erros comuns
      if (reportData.code === 40001) {
        return NextResponse.json({ 
          error: 'Parâmetros inválidos. Verifique as datas selecionadas.' 
        }, { status: 400 })
      }
      
      if (reportData.code === 40100 || reportData.code === 40105) {
        // Token expirado
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
        orcamento_diario: 0,
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
    console.error('Erro ao buscar relatório:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
