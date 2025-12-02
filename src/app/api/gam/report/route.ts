import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  const payload = {
    iss: process.env.GAM_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/admanager',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const privateKey = process.env.GAM_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  if (!privateKey) {
    throw new Error('GAM_PRIVATE_KEY não configurada')
  }

  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Erro ao obter token: ${JSON.stringify(data)}`)
  }

  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const networkCode = process.env.GAM_NETWORK_CODE
    if (!networkCode) {
      return NextResponse.json({ error: 'GAM_NETWORK_CODE não configurado' }, { status: 500 })
    }

    const { startDate, endDate } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    console.log('=== GAM REST API - BUSCANDO RELATÓRIO ===')
    console.log(`Período: ${startDate} a ${endDate}`)

    const token = await getAccessToken()
    const baseUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}`

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

    // 1. Criar relatório
    console.log('Criando relatório...')
    
    const createResponse = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: `API Campanhas ${new Date().toISOString().split('T')[0]}`,
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
      }),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      console.error('Erro ao criar relatório:', error)
      return NextResponse.json({ error: 'Erro ao criar relatório', details: error }, { status: 500 })
    }

    const report = await createResponse.json()
    console.log('Relatório criado:', report.name)

    // 2. Executar relatório
    console.log('Executando relatório...')
    
    const runResponse = await fetch(`https://admanager.googleapis.com/v1/${report.name}:run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!runResponse.ok) {
      const error = await runResponse.text()
      console.error('Erro ao executar relatório:', error)
      return NextResponse.json({ error: 'Erro ao executar relatório', details: error }, { status: 500 })
    }

    const operation = await runResponse.json()
    console.log('Operação:', operation.name)

    // 3. Polling até completar
    let operationStatus = operation
    let attempts = 0
    const maxAttempts = 60

    while (!operationStatus.done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++

      const statusResponse = await fetch(`https://admanager.googleapis.com/v1/${operation.name}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      operationStatus = await statusResponse.json()
      console.log(`Status: ${operationStatus.done ? 'DONE' : 'RUNNING'} (${attempts}/${maxAttempts})`)
    }

    if (!operationStatus.done) {
      return NextResponse.json({ error: 'Timeout ao aguardar relatório' }, { status: 504 })
    }

    // 4. AGUARDAR 3 SEGUNDOS após done=true para garantir que o resultado está disponível
    console.log('Aguardando disponibilidade do resultado...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 5. Buscar resultados
    console.log('Buscando resultados...')
    
    const resultName = operationStatus.response?.reportResult
    console.log('Result name:', resultName)

    if (!resultName) {
      return NextResponse.json({ 
        error: 'Resultado não encontrado na resposta',
        operation: operationStatus 
      }, { status: 500 })
    }

    // fetchRows é GET sem body
    const fetchUrl = `https://admanager.googleapis.com/v1/${resultName}:fetchRows`
    console.log('Fetch URL:', fetchUrl)
    
    let resultsResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    // Se ainda der 404, tentar mais uma vez com delay maior
    if (resultsResponse.status === 404) {
      console.log('404 na primeira tentativa, aguardando mais 5 segundos...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      resultsResponse = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
    }

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text()
      console.error('Erro ao buscar rows:', errorText)
      return NextResponse.json({ 
        error: 'Erro ao buscar resultados',
        details: errorText,
        url: fetchUrl,
        status: resultsResponse.status
      }, { status: 500 })
    }

    const results = await resultsResponse.json()
    console.log('Resultados obtidos:', results.rows?.length || 0, 'linhas')

    // 6. Processar dados
    interface CampaignData {
      data: string
      campanha: string
      impressoes: number
      cliques: number
      ctr: number
      receita: number
      ecpm: number
    }

    const campaigns: CampaignData[] = []

    if (results.rows) {
      for (const row of results.rows) {
        const dimensions = row.dimensionValues || []
        const metrics = row.metricValueGroups?.[0]?.primaryValues || []

        const keyValue = dimensions[1]?.stringValue || ''
        const campaignMatch = keyValue.match(/utm_campaign=([^,\s]+)/)

        if (campaignMatch && campaignMatch[1].includes('GUP-01')) {
          campaigns.push({
            data: dimensions[0]?.stringValue || '',
            campanha: campaignMatch[1],
            impressoes: parseInt(metrics[0]?.intValue || '0'),
            cliques: parseInt(metrics[1]?.intValue || '0'),
            ctr: parseFloat(metrics[2]?.doubleValue || '0') * 100,
            receita: parseFloat(metrics[3]?.decimalValue?.value || '0') / 1000000,
            ecpm: parseFloat(metrics[4]?.decimalValue?.value || '0') / 1000000,
          })
        }
      }
    }

    // 7. Limpar relatório
    try {
      await fetch(`https://admanager.googleapis.com/v1/${report.name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      console.log('Relatório temporário removido')
    } catch (e) {
      console.warn('Não foi possível remover relatório temporário')
    }

    const totalReceita = campaigns.reduce((sum, c) => sum + c.receita, 0)

    console.log(`Processadas ${campaigns.length} campanhas`)
    console.log(`Receita total: R$ ${totalReceita.toFixed(2)}`)

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
      totalReceita,
      periodo: { startDate, endDate },
    })

  } catch (error) {
    console.error('Erro geral:', error)
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
