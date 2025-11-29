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
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<GAMRow>(sheet)

  return data.map(row => {
    // Suporta tanto "Chaves-valor" quanto "Chaves valor" (CSV pode variar)
    const chavesValor = row['Chaves-valor'] || (row as any)['Chaves valor'] || ''
    return {
      campanha: chavesValor.replace('utm_campaign=', ''),
      ganho: Number(row['Receita do Ad Exchange']) || 0,
      ecpm: Number(row['eCPM médio do Ad Exchange']) || 0,
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
