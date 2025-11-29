import * as XLSX from 'xlsx'
import { TikTokRow, GAMRow, Campaign } from '@/types'

interface ParsedTikTok {
  campanha: string
  status: string
  gasto: number
  cpc: number
  ctr: number
}

interface ParsedGAM {
  campanha: string
  ganho: number
  ecpm: number
}

export function parseTikTokFile(buffer: ArrayBuffer): ParsedTikTok[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<TikTokRow>(sheet)

  return data
    .filter(row => {
      const nome = row['Nome da campanha'] || ''
      const custo = row['Custo'] || 0
      return !nome.includes('Total') && custo > 0
    })
    .map(row => ({
      campanha: row['Nome da campanha'] || '',
      status: row['Status principal'] || '',
      gasto: Number(row['Custo']) || 0,
      cpc: Number(row['CPC (Destino)']) || 0,
      ctr: Number(row['CTR (Destino)']) || 0,
    }))
}

export function parseGAMFile(buffer: ArrayBuffer): ParsedGAM[] {
  const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

  return data.map(row => {
    // Buscar coluna de campanha (pode variar o nome)
    const chavesValor = row['Chaves-valor'] || row['Chaves valor'] || row['Chaves_valor'] || ''
    
    // Buscar coluna de receita
    const receita = row['Receita do Ad Exchange'] || row['Receita'] || 0
    
    // Buscar coluna de eCPM - tentar várias variações
    let ecpm = 0
    const ecpmKeys = [
      'eCPM médio do Ad Exchange',
      'eCPM medio do Ad Exchange', 
      'eCPM do Ad Exchange',
      'eCPM',
      'ecpm',
      'ECPM'
    ]
    
    for (const key of ecpmKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        ecpm = Number(row[key]) || 0
        break
      }
    }
    
    // Se ainda não encontrou, procurar por chave que contenha 'eCPM' ou 'ecpm'
    if (ecpm === 0) {
      for (const key of Object.keys(row)) {
        if (key.toLowerCase().includes('ecpm')) {
          ecpm = Number(row[key]) || 0
          break
        }
      }
    }

    return {
      campanha: String(chavesValor).replace('utm_campaign=', ''),
      ganho: Number(receita) || 0,
      ecpm: ecpm,
    }
  })
}

export function mergeData(tiktok: ParsedTikTok[], gam: ParsedGAM[]): Omit<Campaign, 'id' | 'import_id' | 'created_at'>[] {
  const gamMap = new Map<string, ParsedGAM>()
  gam.forEach(row => gamMap.set(row.campanha, row))

  return tiktok.map(tk => {
    const gamData = gamMap.get(tk.campanha)
    const ganho = gamData?.ganho || 0
    const ecpm = gamData?.ecpm || 0
    const lucro = ganho - tk.gasto
    const roi = tk.gasto > 0 ? ((ganho - tk.gasto) / tk.gasto) * 100 : 0

    let status: 'ATIVO' | 'PAUSADO' | 'SEM DADOS'
    if (ganho === 0) {
      status = 'SEM DADOS'
    } else if (tk.status === 'Active') {
      status = 'ATIVO'
    } else if (tk.status === 'Pausado') {
      status = 'PAUSADO'
    } else {
      status = 'PAUSADO'
    }

    return {
      campanha: tk.campanha,
      status,
      gasto: tk.gasto,
      ganho,
      lucro_prejuizo: lucro,
      roi,
      cpc: tk.cpc,
      ctr: tk.ctr,
      ecpm,
    }
  })
}
