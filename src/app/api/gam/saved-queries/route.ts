import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getGAMClient() {
  const { AdManagerClient, GoogleSACredential, StatementBuilder } = await import('@guardian/google-admanager-api')
  return { AdManagerClient, GoogleSACredential, StatementBuilder }
}

export async function GET(request: NextRequest) {
  try {
    const networkCode = process.env.GAM_NETWORK_CODE
    const clientEmail = process.env.GAM_CLIENT_EMAIL
    const privateKey = process.env.GAM_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!networkCode || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'Configuração do GAM não encontrada' }, { status: 500 })
    }

    console.log('=== LISTANDO RELATÓRIOS SALVOS ===')

    const { AdManagerClient, GoogleSACredential, StatementBuilder } = await getGAMClient()

    const credential = new GoogleSACredential({
      private_key: privateKey,
      client_email: clientEmail,
    })

    const adManager = new AdManagerClient(
      parseInt(networkCode),
      credential,
      'Arbitragem Dashboard'
    )

    const reportService = await adManager.getService('ReportService')

    // Buscar TODOS os relatórios salvos
    console.log('Buscando todos os relatórios salvos...')
    
    const statementBuilder = new StatementBuilder()
    statementBuilder.limit(500)
    const savedQueries = await reportService.getSavedQueriesByStatement(statementBuilder.toStatement())

    const queries = (savedQueries as any)?.results || []
    
    console.log('Total de relatórios:', (savedQueries as any)?.totalResultSetSize || 0)

    // Mapear informações relevantes
    const reports = queries.map((q: any) => ({
      id: q.id,
      name: q.name,
      isCompatibleWithApiVersion: q.isCompatibleWithApiVersion,
      reportQueryPresent: !!q.reportQuery,
    }))

    console.log('Relatórios encontrados:', JSON.stringify(reports, null, 2))

    return NextResponse.json({
      success: true,
      total: reports.length,
      reports
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno',
      details: error.toString()
    }, { status: 500 })
  }
}


