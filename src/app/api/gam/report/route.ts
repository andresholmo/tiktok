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
      displayName: `API Campanhas ${startDate}`,
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
        currencyCode: 'BRL'
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
    console.log('Operation response:', JSON.stringify(operationStatus, null, 2))
    
    // O resultado pode estar em diferentes lugares dependendo da estrutura
    const resultName = operationStatus.response?.result || 
                       operationStatus.response?.name ||
                       operationStatus.metadata?.result
    
    // Se não tiver result, tentar buscar diretamente do relatório
    let resultsData: any = null
    
    if (resultName) {
      console.log('Buscando de:', resultName)
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

      if (resultsResponse.ok) {
        resultsData = await resultsResponse.json()
      } else {
        console.log('Erro ao buscar rows:', await resultsResponse.text())
      }
    }
    
    // Alternativa: buscar os resultados diretamente pelo report ID
    if (!resultsData || !resultsData.rows) {
      console.log('Tentando busca alternativa...')
      
      // Listar os results do relatório
      const listResultsResponse = await fetch(
        `${baseUrl}/reports/${report.reportId}/results`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )
      
      if (listResultsResponse.ok) {
        const listResults = await listResultsResponse.json()
        console.log('Results list:', JSON.stringify(listResults, null, 2))
        
        if (listResults.results && listResults.results.length > 0) {
          const latestResult = listResults.results[0]
          
          const fetchRowsResponse = await fetch(
            `https://admanager.googleapis.com/v1/${latestResult.name}:fetchRows`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ pageSize: 1000 }),
            }
          )
          
          if (fetchRowsResponse.ok) {
            resultsData = await fetchRowsResponse.json()
          } else {
            console.log('Erro fetchRows:', await fetchRowsResponse.text())
          }
        }
      } else {
        console.log('Erro ao listar results:', await listResultsResponse.text())
      }
    }

    if (!resultsData) {
      return NextResponse.json({ 
        error: 'Não foi possível obter resultados do relatório',
        operation: operationStatus,
        reportId: report.reportId
      }, { status: 500 })
    }

    console.log('Resultados obtidos:', resultsData.totalRowCount || resultsData.rows?.length || 0, 'linhas')

    // 5. Processar dados
    const campaigns: any[] = []
    
    if (resultsData.rows) {
      for (const row of resultsData.rows) {
        const dimensions = row.dimensionValues || []
        const metrics = row.metricValueGroups?.[0]?.primaryValues || []

        // Extrair nome da campanha do KEY_VALUES_NAME
        // Formato esperado: "utm_campaign=GUP-01-SDM-xxx"
        const keyValue = dimensions[1]?.stringValue || ''
        const campaignMatch = keyValue.match(/utm_campaign=([^,\s]+)/)
        
        if (campaignMatch && campaignMatch[1].includes('GUP-01')) {
          // Extrair valores das métricas
          const impressoes = parseInt(metrics[0]?.intValue || '0')
          const cliques = parseInt(metrics[1]?.intValue || '0')
          
          // CTR pode vir como double ou percentage
          let ctr = 0
          if (metrics[2]?.doubleValue) {
            ctr = parseFloat(metrics[2].doubleValue) * 100
          } else if (metrics[2]?.intValue) {
            ctr = parseFloat(metrics[2].intValue)
          }
          
          // Receita - pode estar em micros (dividir por 1000000)
          let receita = 0
          if (metrics[3]?.decimalValue?.value) {
            receita = parseFloat(metrics[3].decimalValue.value) / 1000000
          } else if (metrics[3]?.intValue) {
            receita = parseFloat(metrics[3].intValue) / 1000000
          } else if (metrics[3]?.doubleValue) {
            receita = parseFloat(metrics[3].doubleValue)
          }
          
          // eCPM
          let ecpm = 0
          if (metrics[4]?.decimalValue?.value) {
            ecpm = parseFloat(metrics[4].decimalValue.value) / 1000000
          } else if (metrics[4]?.intValue) {
            ecpm = parseFloat(metrics[4].intValue) / 1000000
          } else if (metrics[4]?.doubleValue) {
            ecpm = parseFloat(metrics[4].doubleValue)
          }

          campaigns.push({
            data: dimensions[0]?.stringValue || startDate,
            campanha: campaignMatch[1],
            impressoes,
            cliques,
            ctr,
            receita,
            ecpm,
          })
        }
      }
    }

    // 6. Limpar relatório criado
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
