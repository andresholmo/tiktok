import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const networkCode = process.env.GAM_NETWORK_CODE
    const clientEmail = process.env.GAM_CLIENT_EMAIL
    const privateKey = process.env.GAM_PRIVATE_KEY?.replace(/\\n/g, '\n')

    // Verificar variáveis de ambiente
    if (!networkCode || !clientEmail || !privateKey) {
      return NextResponse.json({
        success: false,
        error: 'Variáveis de ambiente não configuradas',
        details: {
          hasNetworkCode: !!networkCode,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
        }
      }, { status: 500 })
    }

    console.log('=== TESTE DE CONEXÃO GAM ===')
    console.log('Network Code:', networkCode)
    console.log('Client Email:', clientEmail)
    console.log('Private Key (20 chars):', privateKey.substring(0, 50))

    // Criar cliente de autenticação
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/dfp'],
    })

    // Testar autenticação obtendo token
    console.log('Obtendo token de acesso...')
    const token = await auth.getAccessToken()
    
    if (!token.token) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível obter token de acesso',
      }, { status: 500 })
    }

    console.log('Token obtido com sucesso!')

    // Testar chamada à API do GAM (listar networks)
    const response = await fetch(
      `https://admanager.googleapis.com/v1/networks/${networkCode}`,
      {
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('Status da resposta:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro da API:', errorText)
      return NextResponse.json({
        success: false,
        error: 'Erro ao acessar API do GAM',
        status: response.status,
        details: errorText,
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('Dados da rede:', JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Conexão com GAM estabelecida com sucesso!',
      network: {
        networkCode: data.networkCode,
        displayName: data.displayName,
        propertyCode: data.propertyCode,
      }
    })

  } catch (error: any) {
    console.error('Erro no teste:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido',
      stack: error.stack,
    }, { status: 500 })
  }
}

