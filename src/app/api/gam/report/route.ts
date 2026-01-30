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

    // ========== DEBUG: Estrutura dos dados ==========
    if (results.rows && results.rows.length > 0) {
      console.log('=== DEBUG GAM DATA ===')
      console.log('Primeiras 3 linhas brutas:', JSON.stringify(results.rows.slice(0, 3), null, 2))
      
      const firstRow = results.rows[0]
      console.log('Estrutura da primeira linha:', {
        hasDimensionValues: !!firstRow.dimensionValues,
        hasMetricValueGroups: !!firstRow.metricValueGroups,
        keys: Object.keys(firstRow),
        dimensionValues: firstRow.dimensionValues,
        metricValueGroups: firstRow.metricValueGroups,
      })
      
      if (firstRow.dimensionValues) {
        console.log('Dimension values:', firstRow.dimensionValues.map((d: any, i: number) => ({
          index: i,
          intValue: d.intValue,
          stringValue: d.stringValue,
          value: d.value,
        })))
      }
      
      if (firstRow.metricValueGroups?.[0]?.primaryValues) {
        console.log('Metric values:', firstRow.metricValueGroups[0].primaryValues.map((m: any, i: number) => ({
          index: i,
          intValue: m.intValue,
          doubleValue: m.doubleValue,
          value: m.value,
        })))
      }
    }

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
    let processedCount = 0
    let skippedCount = 0
    let noUtmCampaignCount = 0

    if (results.rows) {
      for (const row of results.rows) {
        const dimensions = row.dimensionValues || []
        const metrics = row.metricValueGroups?.[0]?.primaryValues || []

        // A data vem como intValue no formato YYYYMMDD
        const dateInt = dimensions[0]?.intValue || dimensions[0]?.stringValue || ''
        const dateStr = String(dateInt)
        const formattedDate = dateStr.length === 8 
          ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`
          : dateStr

        // KEY_VALUES_NAME vem como stringValue
        const keyValue = dimensions[1]?.stringValue || dimensions[1]?.value || ''
        
        // DEBUG: Log keyValue para as primeiras linhas
        if (processedCount + skippedCount < 5) {
          console.log(`Linha ${processedCount + skippedCount}: keyValue = "${keyValue}"`)
        }
        
        // Extrair utm_campaign (remover filtro GUP-01 para processar todas)
        const campaignMatch = keyValue.match(/utm_campaign=([^,&\s]+)/)

        if (!campaignMatch) {
          noUtmCampaignCount++
          if (noUtmCampaignCount <= 3) {
            console.log(`Linha sem utm_campaign: keyValue = "${keyValue}"`)
          }
          continue
        }

        const campaignName = campaignMatch[1]
        
        // Processar TODAS as campanhas que têm utm_campaign (removido filtro GUP-01)
        const impressoes = parseInt(metrics[0]?.intValue || metrics[0]?.value || '0')
        const cliques = parseInt(metrics[1]?.intValue || metrics[1]?.value || '0')
        const ctr = (metrics[2]?.doubleValue || metrics[2]?.value || 0) * 100
        const receita = metrics[3]?.doubleValue || metrics[3]?.value || 0
        const ecpm = metrics[4]?.doubleValue || metrics[4]?.value || 0

        campaigns.push({
          data: formattedDate,
          campanha: campaignName,
          impressoes,
          cliques,
          ctr,
          receita,
          ecpm,
        })
        
        processedCount++
        
        // DEBUG: Log primeiras campanhas processadas
        if (processedCount <= 5) {
          console.log(`Campanha processada ${processedCount}:`, {
            campanha: campaignName,
            receita,
            impressoes,
            cliques,
          })
        }
      }
    }

    console.log(`=== RESUMO DO PROCESSAMENTO ===`)
    console.log(`Total de linhas: ${results.rows?.length || 0}`)
    console.log(`Campanhas processadas: ${processedCount}`)
    console.log(`Linhas sem utm_campaign: ${noUtmCampaignCount}`)
    console.log(`Primeiras 5 campanhas:`, campaigns.slice(0, 5).map(c => c.campanha))

    // Agrupar por campanha
    const aggregated = campaigns.reduce((acc, curr) => {
      const key = curr.campanha
      if (!acc[key]) {
        acc[key] = { ...curr }
      } else {
        acc[key].impressoes += curr.impressoes
        acc[key].cliques += curr.cliques
        acc[key].receita += curr.receita
        acc[key].ctr = acc[key].impressoes > 0 
          ? (acc[key].cliques / acc[key].impressoes) * 100 
          : 0
        acc[key].ecpm = acc[key].impressoes > 0 
          ? (acc[key].receita / acc[key].impressoes) * 1000 
          : 0
      }
      return acc
    }, {} as Record<string, CampaignData>)

    const finalCampaigns = Object.values(aggregated)

    // 7. Limpar relatório
    try {
      await fetch(`https://admanager.googleapis.com/v1/${report.name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
    } catch (e) {
      // Ignorar
    }

    const totalReceita = finalCampaigns.reduce((sum, c) => sum + c.receita, 0)
    const totalImpressoes = finalCampaigns.reduce((sum, c) => sum + c.impressoes, 0)
    const totalCliques = finalCampaigns.reduce((sum, c) => sum + c.cliques, 0)

    console.log(`GAM Campanhas: ${finalCampaigns.length} campanhas, R$ ${(totalReceita ?? 0).toFixed(2)}`)

    return NextResponse.json({
      success: true,
      campaigns: finalCampaigns,
      total: finalCampaigns.length,
      totalReceita,
      totalImpressoes,
      totalCliques,
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
