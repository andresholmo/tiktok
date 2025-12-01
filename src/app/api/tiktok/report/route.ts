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

    // Endpoint para listar campanhas com query params
    const apiUrl = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&page_size=100`

    console.log('=== CHAMANDO API TIKTOK ===')
    console.log('URL:', apiUrl)
    console.log('Token (20 chars):', credentials.access_token.substring(0, 20))

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Access-Token': credentials.access_token,
      },
    })

    console.log('Status:', response.status)
    
    const responseText = await response.text()
    console.log('Resposta:', responseText.substring(0, 1000))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Erro ao parsear JSON:', e)
      return NextResponse.json({ 
        error: 'Resposta inválida do TikTok' 
      }, { status: 500 })
    }

    console.log('Código TikTok:', data.code)
    console.log('Mensagem:', data.message)

    if (data.code !== 0) {
      // Verificar erros comuns
      if (data.code === 40001) {
        return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
      }
      if (data.code === 40100 || data.code === 40105 || data.message?.includes('token')) {
        // Token expirado - limpar credenciais
        await supabase.from('tiktok_credentials').delete().eq('user_id', user.id)
        return NextResponse.json({ error: 'Token expirado. Reconecte o TikTok.' }, { status: 401 })
      }
      return NextResponse.json({ 
        error: data.message || 'Erro do TikTok',
        code: data.code 
      }, { status: 500 })
    }

    // Processar lista de campanhas
    const campaignList = data.data?.list || []
    
    console.log('Campanhas encontradas:', campaignList.length)

    const campaigns = campaignList.map((item: any) => ({
      campaign_id: item.campaign_id || '',
      campanha: item.campaign_name || 'Sem nome',
      status: item.operation_status || item.status || 'UNKNOWN',
      orcamento_diario: parseFloat(item.budget) || 0,
      gasto: 0,
      cpc: 0,
      ctr: 0,
    }))

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
    })

  } catch (error: any) {
    console.error('Erro geral:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
