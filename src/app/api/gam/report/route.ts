import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos

async function getAuthToken() {
  const clientEmail = process.env.GAM_CLIENT_EMAIL
  const privateKey = process.env.GAM_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('Credenciais GAM não configuradas')
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/admanager'],
  })

  const token = await auth.getAccessToken()
  return token.token
}

export async function POST(request: NextRequest) {
  try {
    const networkCode = process.env.GAM_NETWORK_CODE

    if (!networkCode) {
      return NextResponse.json({ error: 'Network code não configurado' }, { status: 500 })
    }

    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    console.log('=== GAM REST API - BUSCANDO RELATÓRIO ===')
    console.log('Período:', startDate, 'a', endDate)

    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Erro de autenticação' }, { status: 500 })
    }

    const baseUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}`

    // Parsear datas
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

    // 1. Criar relatório
    console.log('Criando relatório...')
    
    const reportDefinition = {
      displayName: `API Campanhas TikTok ${startDate}`,
      visibility: 'HIDDEN',
      reportDefinition: {
        dimensions: ['DATE', 'KEY_VALUES_NAME'],
        metrics: [
          'AD_EXCHANGE_IMPRESSIONS',
          'AD_EXCHANGE_CLICKS',
          'AD_EXCHANGE_CTR',
          'AD_EXCHANGE_REVENUE',
          'AD_EXCHANGE_AVERAGE_ECPM'
        ],
        dateRange: {
          fixed: {
            startDate: { year: startYear, month: startMonth, day: startDay },
            endDate: { year: endYear, month: endMonth, day: endDay }
          }
        },
        reportType: 'HISTORICAL',
        currencyCode: 'BRL',
        filters: [
          {
            fieldFilter: {
              field: 'KEY_VALUES_NAME',
              operation: 'CONTAINS',
              values: [{ stringValue: 'utm_campaign' }]
            }
          }
        ]
      }
    }

    const createResponse = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportDefinition),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('Erro ao criar relatório:', errorText)
      return NextResponse.json({ 
        error: 'Erro ao criar relatório',
        details: errorText 
      }, { status: 500 })
    }

    const report = await createResponse.json()
    console.log('Relatório criado:', report.name)

    // 2. Executar relatório
    console.log('Executando relatório...')
    
    const runResponse = await fetch(`${baseUrl}/reports/${report.reportId}:run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('Erro ao executar:', errorText)
      return NextResponse.json({ 
        error: 'Erro ao executar relatório',
        details: errorText 
      }, { status: 500 })
    }

    const operation = await runResponse.json()
    console.log('Operação:', operation.name)

    // 3. Aguardar conclusão (polling)
    let operationStatus = operation
    let attempts = 0
    const maxAttempts = 60 // 5 minutos

    while (!operationStatus.done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      const statusResponse = await fetch(
        `https://admanager.googleapis.com/v1/${operationStatus.name}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )
      
      operationStatus = await statusResponse.json()
      attempts++
      console.log(`Status: ${operationStatus.done ? 'DONE' : 'RUNNING'} (${attempts}/${maxAttempts})`)
    }

    if (!operationStatus.done) {
      return NextResponse.json({ error: 'Timeout aguardando relatório' }, { status: 500 })
    }

    if (operationStatus.error) {
      return NextResponse.json({ 
        error: 'Relatório falhou',
        details: operationStatus.error 
      }, { status: 500 })
    }

    // 4. Buscar resultados
    console.log('Buscando resultados...')
    const resultName = operationStatus.response?.result
    
    if (!resultName) {
      return NextResponse.json({ 
        error: 'Resultado não encontrado',
        operation: operationStatus 
      }, { status: 500 })
    }

    const resultsResponse = await fetch(
      `https://admanager.googleapis.com/v1/${resultName}:fetchRows`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageSize: 1000 }),
      }
    )

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text()
      console.error('Erro ao buscar resultados:', errorText)
      return NextResponse.json({ 
        error: 'Erro ao buscar resultados',
        details: errorText 
      }, { status: 500 })
    }

    const results = await resultsResponse.json()
    console.log('Resultados:', results.totalRowCount || 0, 'linhas')

    // 5. Processar dados
    const campaigns: any[] = []
    
    if (results.rows) {
      for (const row of results.rows) {
        const dimensions = row.dimensionValues || []
        const metrics = row.metricValueGroups?.[0]?.primaryValues || []

        // Extrair nome da campanha
        const keyValue = dimensions[1]?.stringValue || ''
        const campaignMatch = keyValue.match(/utm_campaign=([^,]+)/)
        
        if (campaignMatch && campaignMatch[1].includes('GUP-01')) {
          campaigns.push({
            data: dimensions[0]?.stringValue || '',
            campanha: campaignMatch[1],
            impressoes: parseInt(metrics[0]?.intValue || '0'),
            cliques: parseInt(metrics[1]?.intValue || '0'),
            ctr: parseFloat(metrics[2]?.doubleValue || '0') * 100,
            receita: parseFloat(metrics[3]?.decimalValue?.value || metrics[3]?.intValue || '0') / 1000000,
            ecpm: parseFloat(metrics[4]?.decimalValue?.value || metrics[4]?.intValue || '0') / 1000000,
          })
        }
      }
    }

    // 6. Limpar relatório criado (opcional)
    try {
      await fetch(`${baseUrl}/reports/${report.reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      console.log('Relatório temporário deletado')
    } catch (e) {
      console.log('Não foi possível deletar relatório temporário')
    }

    // Calcular totais
    const totalReceita = campaigns.reduce((sum, c) => sum + c.receita, 0)

    console.log(`Processadas ${campaigns.length} campanhas, receita total: R$ ${totalReceita.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
      totalReceita,
      periodo: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
