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

    // Tentar endpoint de campanha primeiro (mais simples)
    const apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/campaign/get/'
    
    const requestBody = {
      advertiser_id: credentials.advertiser_id,
      page_size: 1000,
    }

    console.log('=== CHAMANDO API TIKTOK ===')
    console.log('URL:', apiUrl)
    console.log('Advertiser ID:', credentials.advertiser_id)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': credentials.access_token,
      },
    })

    console.log('Status:', response.status)
    
    const responseText = await response.text()
    console.log('Resposta (primeiros 500 chars):', responseText.substring(0, 500))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // Se não for JSON, tentar com query params no GET
      const urlWithParams = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${credentials.advertiser_id}&page_size=100`
      
      console.log('Tentando URL com params:', urlWithParams)
      
      const response2 = await fetch(urlWithParams, {
        method: 'GET',
        headers: {
          'Access-Token': credentials.access_token,
        },
      })
      
      console.log('Status 2:', response2.status)
      const text2 = await response2.text()
      console.log('Resposta 2:', text2.substring(0, 500))
      
      try {
        data = JSON.parse(text2)
      } catch (e2) {
        return NextResponse.json({ 
          error: 'API do TikTok não respondeu corretamente. Verifique se o app tem as permissões necessárias.' 
        }, { status: 500 })
      }
    }

    console.log('Código de resposta TikTok:', data.code)
    console.log('Mensagem:', data.message)

    if (data.code !== 0) {
      return NextResponse.json({ 
        error: data.message || 'Erro do TikTok',
        code: data.code 
      }, { status: 500 })
    }

    // Processar lista de campanhas
    const campaignList = data.data?.list || []
    
    const campaigns = campaignList.map((item: any) => ({
      campaign_id: item.campaign_id || '',
      campanha: item.campaign_name || 'Sem nome',
      gasto: 0, // Endpoint de campaign não retorna gasto
      status: item.operation_status || item.status || 'UNKNOWN',
      orcamento_diario: parseFloat(item.budget) || 0,
    }))

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
      message: 'Campanhas encontradas. Para ver gastos, use o relatório manual.',
    })

  } catch (error: any) {
    console.error('Erro geral:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
