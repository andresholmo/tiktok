import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const networkCode = process.env.GAM_NETWORK_CODE
    const clientEmail = process.env.GAM_CLIENT_EMAIL
    const privateKey = process.env.GAM_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!networkCode || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'Configuração do GAM não encontrada' }, { status: 500 })
    }

    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    console.log('=== BUSCANDO DADOS DO GAM ===')
    console.log('Período:', startDate, 'a', endDate)

    // Autenticação
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/dfp'],
    })

    const token = await auth.getAccessToken()
    if (!token.token) {
      return NextResponse.json({ error: 'Erro de autenticação' }, { status: 500 })
    }

    // A API do Ad Manager para relatórios requer uso de SOAP ou a nova API REST beta
    // Vamos tentar a API REST para obter dados básicos da rede primeiro
    
    // Endpoint correto para a API REST v1
    const baseUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}`

    // 1. Buscar informações da rede (já sabemos que funciona)
    const networkResponse = await fetch(baseUrl, {
      headers: {
        'Authorization': `Bearer ${token.token}`,
      },
    })

    if (!networkResponse.ok) {
      const errorText = await networkResponse.text()
      console.error('Erro ao acessar rede:', errorText)
      return NextResponse.json({ 
        error: 'Erro ao acessar GAM',
        details: errorText 
      }, { status: 500 })
    }

    const networkData = await networkResponse.json()
    console.log('Rede:', networkData.displayName)

    // 2. A API REST v1 do GAM ainda não suporta relatórios completos
    // Para relatórios, precisamos usar a API SOAP ou exportar manualmente
    // Por enquanto, vamos retornar uma mensagem informativa

    return NextResponse.json({
      success: true,
      message: 'Conexão com GAM OK. Relatórios requerem configuração adicional.',
      network: {
        code: networkData.networkCode,
        name: networkData.displayName,
        propertyCode: networkData.propertyCode,
      },
      info: 'A API REST do GAM ainda não suporta relatórios de Ad Exchange com chaves-valor. Use o upload manual do CSV exportado do GAM por enquanto.',
      suggestion: 'Para automação completa, seria necessário implementar a API SOAP do GAM, que é mais complexa.'
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
