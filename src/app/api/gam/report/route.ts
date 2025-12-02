import { NextRequest, NextResponse } from 'next/server'
import { GAM_REPORTS } from '@/lib/gam-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function getGAMClient() {
  const { AdManagerClient, GoogleSACredential, StatementBuilder } = await import('@guardian/google-admanager-api')
  return { AdManagerClient, GoogleSACredential, StatementBuilder }
}

export async function POST(request: NextRequest) {
  try {
    const networkCode = process.env.GAM_NETWORK_CODE
    const clientEmail = process.env.GAM_CLIENT_EMAIL
    const privateKey = process.env.GAM_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!networkCode || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'Configuração do GAM não encontrada' }, { status: 500 })
    }

    const body = await request.json()
    const { startDate, endDate, reportType = 'campanhas' } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
    }

    console.log('=== BUSCANDO RELATÓRIO GAM ===')
    console.log('Tipo:', reportType)
    console.log('Período:', startDate, 'a', endDate)

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

    // Escolher qual relatório buscar
    const savedQueryId = GAM_REPORTS.FATURAMENTO_SITE

    console.log('Buscando relatório salvo ID:', savedQueryId)

    // Buscar o relatório salvo específico
    const statementBuilder = new StatementBuilder()
    statementBuilder.where(`id = ${savedQueryId}`)
    const savedQueries = await reportService.getSavedQueriesByStatement(statementBuilder.toStatement())

    const savedQuery = savedQueries?.results?.[0]

    if (!savedQuery) {
      return NextResponse.json({ 
        error: `Relatório salvo não encontrado (ID: ${savedQueryId})` 
      }, { status: 404 })
    }

    console.log('Relatório encontrado:', savedQuery.name)

    // Modificar datas do relatório
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

    const reportQuery = { 
      ...savedQuery.reportQuery,
      dateRangeType: 'CUSTOM_DATE' as any,
      startDate: { year: startYear, month: startMonth, day: startDay },
      endDate: { year: endYear, month: endMonth, day: endDay }
    }

    console.log('Executando relatório...')

    const reportJob = await reportService.runReportJob({ 
      reportQuery 
    } as any)
    
    console.log('Report Job ID:', reportJob?.id)

    if (!reportJob?.id) {
      return NextResponse.json({ error: 'Falha ao criar job de relatório' }, { status: 500 })
    }

    // Aguardar conclusão
    let status = (reportJob as any).reportJobStatus
    let attempts = 0

    while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      const statusResult = await reportService.getReportJobStatus({ reportJobId: (reportJob as any).id } as any)
      status = (statusResult as any)?.reportJobStatus || status
      attempts++
      console.log(`Status: ${status} (${attempts}/60)`)
    }

    if (status !== 'COMPLETED') {
      return NextResponse.json({ 
        error: status === 'FAILED' ? 'Relatório falhou' : 'Timeout' 
      }, { status: 500 })
    }

    // Baixar relatório
    const downloadUrl = await reportService.getReportDownloadURL(
      (reportJob as any).id,
      'CSV_DUMP' as any
    )

    console.log('Baixando de:', downloadUrl)

    const reportResponse = await fetch(downloadUrl)
    const reportText = await reportResponse.text()

    console.log('CSV (500 chars):', reportText.substring(0, 500))

    // Parsear CSV
    const lines = reportText.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ success: true, campaigns: [], total: 0 })
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const campaigns: any[] = []

    for (let i = 1; i < lines.length; i++) {
      // Tratar valores com vírgula dentro de aspas
      const values = parseCSVLine(lines[i])
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })

      // Extrair dados baseado no tipo de relatório
      if (reportType === 'faturamento') {
        // Relatório de source - pegar apenas tiktok
        const source = findValue(row, ['utm_source', 'source', 'Dimension'])
        if (source?.toLowerCase() === 'tiktok') {
          campaigns.push({
            source: 'tiktok',
            receita: parseRevenue(row),
            ecpm: parseEcpm(row),
            ctr: parseCtr(row),
          })
        }
      } else {
        // Relatório de campanhas
        const campanha = extractCampaignName(row)
        if (campanha) {
          campaigns.push({
            campanha,
            receita: parseRevenue(row),
            ecpm: parseEcpm(row),
            ctr: parseCtr(row),
          })
        }
      }
    }

    // Para faturamento, calcular total
    const faturamentoTotal = reportType === 'faturamento'
      ? campaigns.reduce((sum, c) => sum + c.receita, 0)
      : undefined

    console.log(`Processadas ${campaigns.length} linhas`)

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
      faturamentoTotal,
      periodo: { startDate, endDate },
      reportName: savedQuery.name
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno',
      details: error.toString()
    }, { status: 500 })
  }
}

// Funções auxiliares
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function findValue(row: any, possibleKeys: string[]): string {
  for (const key of Object.keys(row)) {
    for (const possible of possibleKeys) {
      if (key.toLowerCase().includes(possible.toLowerCase())) {
        return row[key]
      }
    }
  }
  return ''
}

function extractCampaignName(row: any): string {
  for (const [key, value] of Object.entries(row)) {
    const strValue = String(value)
    // Procurar utm_campaign=NOME
    const match = strValue.match(/utm_campaign[=:]([^,\s]+)/)
    if (match) return match[1]
    
    // Procurar padrão GUP-01-SDM-
    if (strValue.includes('GUP-01-SDM-')) {
      const gupMatch = strValue.match(/(GUP-01-SDM-[A-Z0-9-]+)/i)
      if (gupMatch) return gupMatch[1]
    }
  }
  return ''
}

function parseRevenue(row: any): number {
  for (const [key, value] of Object.entries(row)) {
    if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('receita')) {
      const num = parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0
      // Se valor muito grande, provavelmente está em micros
      return num > 100000 ? num / 1000000 : num
    }
  }
  return 0
}

function parseEcpm(row: any): number {
  for (const [key, value] of Object.entries(row)) {
    if (key.toLowerCase().includes('ecpm')) {
      const num = parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0
      return num > 100000 ? num / 1000000 : num
    }
  }
  return 0
}

function parseCtr(row: any): number {
  for (const [key, value] of Object.entries(row)) {
    if (key.toLowerCase().includes('ctr')) {
      return parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0
    }
  }
  return 0
}
