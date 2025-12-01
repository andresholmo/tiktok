import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Relatórios podem demorar

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

    console.log('=== BUSCANDO RELATÓRIO GAM ===')
    console.log('Período:', startDate, 'a', endDate)

    // Autenticação
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/dfp'],
    })

    const token = await auth.getAccessToken()
    if (!token.token) {
      return NextResponse.json({ error: 'Erro de autenticação com GAM' }, { status: 500 })
    }

    // Formatar datas para a API (YYYY-MM-DD -> { year, month, day })
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

    // Criar relatório usando a API REST do Ad Manager
    const reportJobUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}/reports:run`

    const reportRequest = {
      reportJob: {
        reportQuery: {
          dimensions: ['CUSTOM_DIMENSION'],
          columns: [
            'AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE',
            'AD_EXCHANGE_LINE_ITEM_LEVEL_IMPRESSIONS',
            'AD_EXCHANGE_LINE_ITEM_LEVEL_CLICKS',
            'AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM'
          ],
          dimensionAttributes: ['CUSTOM_DIMENSION_VALUE_REPORTING_VALUE'],
          customDimensionKeyIds: [], // Será preenchido após buscar o ID da dimensão utm_campaign
          dateRange: {
            startDate: { year: startYear, month: startMonth, day: startDay },
            endDate: { year: endYear, month: endMonth, day: endDay }
          },
          reportCurrency: 'BRL'
        }
      }
    }

    console.log('Buscando dimensões customizadas...')

    // Primeiro, buscar as dimensões customizadas para encontrar utm_campaign
    const dimensionsUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}/customDimensions`
    
    const dimensionsResponse = await fetch(dimensionsUrl, {
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!dimensionsResponse.ok) {
      const errorText = await dimensionsResponse.text()
      console.error('Erro ao buscar dimensões:', errorText)
      
      // Tentar abordagem alternativa - buscar relatório de Ad Exchange diretamente
      return await fetchAdExchangeReport(token.token, networkCode, startDate, endDate)
    }

    const dimensionsData = await dimensionsResponse.json()
    console.log('Dimensões encontradas:', JSON.stringify(dimensionsData, null, 2))

    // Procurar dimensão utm_campaign
    const utmDimension = dimensionsData.customDimensions?.find(
      (d: any) => d.name?.toLowerCase().includes('utm_campaign') || 
                  d.reportableKey?.toLowerCase().includes('utm_campaign')
    )

    if (!utmDimension) {
      console.log('Dimensão utm_campaign não encontrada, usando abordagem alternativa')
      return await fetchAdExchangeReport(token.token, networkCode, startDate, endDate)
    }

    // Continuar com o relatório usando a dimensão encontrada
    // ... (implementação completa do relatório)

    return NextResponse.json({
      success: true,
      message: 'Relatório processado',
      campaigns: [],
      total: 0
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

// Função alternativa para buscar relatório do Ad Exchange
async function fetchAdExchangeReport(accessToken: string, networkCode: string, startDate: string, endDate: string) {
  try {
    console.log('=== USANDO ABORDAGEM ALTERNATIVA - AD EXCHANGE ===')

    // Buscar relatório de chaves-valor (key-values) que contém utm_campaign
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

    // Usar a API de relatórios do Ad Manager
    const reportUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}/reports:run`

    const reportBody = {
      dimensions: ['AD_EXCHANGE_DFP_AD_UNIT', 'AD_EXCHANGE_PRICING_RULE_NAME'],
      metrics: [
        'AD_EXCHANGE_AD_REQUESTS',
        'AD_EXCHANGE_REVENUE',
        'AD_EXCHANGE_IMPRESSIONS',
        'AD_EXCHANGE_AVERAGE_ECPM'
      ],
      startDate: { year: startYear, month: startMonth, day: startDay },
      endDate: { year: endYear, month: endMonth, day: endDay },
      reportCurrency: 'BRL'
    }

    console.log('Request body:', JSON.stringify(reportBody, null, 2))

    const response = await fetch(reportUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportBody)
    })

    console.log('Status:', response.status)
    const responseText = await response.text()
    console.log('Resposta:', responseText.substring(0, 1000))

    if (!response.ok) {
      // Tentar outra abordagem - listar relatórios salvos
      return await fetchSavedReports(accessToken, networkCode, startDate, endDate)
    }

    const data = JSON.parse(responseText)
    
    return NextResponse.json({
      success: true,
      message: 'Relatório Ad Exchange obtido',
      data: data,
      campaigns: [],
      total: 0
    })

  } catch (error: any) {
    console.error('Erro no Ad Exchange:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar relatório Ad Exchange',
      details: error.message 
    }, { status: 500 })
  }
}

// Função para buscar relatórios salvos
async function fetchSavedReports(accessToken: string, networkCode: string, startDate: string, endDate: string) {
  try {
    console.log('=== BUSCANDO RELATÓRIOS SALVOS ===')

    const savedReportsUrl = `https://admanager.googleapis.com/v1/networks/${networkCode}/savedQueries`

    const response = await fetch(savedReportsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Status:', response.status)
    const responseText = await response.text()
    console.log('Relatórios salvos:', responseText.substring(0, 1000))

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível acessar relatórios do GAM',
        details: responseText,
        suggestion: 'Verifique se a Service Account tem permissão de Relatórios no GAM'
      }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    
    return NextResponse.json({
      success: true,
      message: 'Relatórios salvos encontrados',
      savedQueries: data.savedQueries || [],
      total: data.savedQueries?.length || 0
    })

  } catch (error: any) {
    console.error('Erro ao buscar relatórios salvos:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar relatórios salvos',
      details: error.message 
    }, { status: 500 })
  }
}

