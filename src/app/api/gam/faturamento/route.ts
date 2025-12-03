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

    console.log('=== GAM: Buscando Faturamento TikTok Total ===')
    console.log(`Período: ${startDate} a ${endDate}`)

    const token = await getAccessToken()
    const baseUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}`

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

    // Criar relatório de Source para buscar faturamento por utm_source
    console.log('Criando relatório de faturamento...')
    
    const createResponse = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: `API Faturamento Source ${new Date().toISOString().split('T')[0]}`,
        visibility: 'HIDDEN',
        reportDefinition: {
          dimensions: ['DATE', 'KEY_VALUES_NAME'],
          metrics: [
            'AD_EXCHANGE_IMPRESSIONS',
            'AD_EXCHANGE_REVENUE',
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

    // Executar relatório
    const runResponse = await fetch(`https://admanager.googleapis.com/v1/${report.name}:run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!runResponse.ok) {
      const error = await runResponse.text()
      return NextResponse.json({ error: 'Erro ao executar relatório', details: error }, { status: 500 })
    }

    const operation = await runResponse.json()
    console.log('Operação:', operation.name)

    // Polling até completar
    let operationStatus = operation
    let attempts = 0

    while (!operationStatus.done && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++

      const statusResponse = await fetch(`https://admanager.googleapis.com/v1/${operation.name}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      operationStatus = await statusResponse.json()
      console.log(`Status: ${operationStatus.done ? 'DONE' : 'RUNNING'} (${attempts}/60)`)
    }

    if (!operationStatus.done) {
      return NextResponse.json({ error: 'Timeout ao aguardar relatório' }, { status: 504 })
    }

    // Aguardar disponibilidade
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Buscar resultados
    const resultName = operationStatus.response?.reportResult

    if (!resultName) {
      return NextResponse.json({ error: 'Resultado não encontrado' }, { status: 500 })
    }

    const fetchUrl = `https://admanager.googleapis.com/v1/${resultName}:fetchRows`
    
    let resultsResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (resultsResponse.status === 404) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      resultsResponse = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
    }

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text()
      return NextResponse.json({ error: 'Erro ao buscar resultados', details: errorText }, { status: 500 })
    }

    const results = await resultsResponse.json()

    // Calcular faturamento TikTok (utm_source=tiktok)
    let faturamentoTikTok = 0
    let impressoesTikTok = 0

    if (results.rows) {
      for (const row of results.rows) {
        const dimensions = row.dimensionValues || []
        const metrics = row.metricValueGroups?.[0]?.primaryValues || []

        const keyValue = dimensions[1]?.stringValue || ''
        
        // Verificar se é utm_source=tiktok
        if (keyValue.toLowerCase().includes('utm_source=tiktok')) {
          impressoesTikTok += parseInt(metrics[0]?.intValue || '0')
          faturamentoTikTok += metrics[1]?.doubleValue || 0
        }
      }
    }

    // Limpar relatório
    try {
      await fetch(`https://admanager.googleapis.com/v1/${report.name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
    } catch (e) {
      // Ignorar
    }

    console.log(`Faturamento TikTok (GAM Total): R$ ${(faturamentoTikTok ?? 0).toFixed(2)}`)

    return NextResponse.json({
      success: true,
      faturamentoTikTok,
      impressoesTikTok,
      periodo: { startDate, endDate },
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}


