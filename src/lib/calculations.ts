import type { TikTokRow, GAMRow, Campaign } from '@/types'

export function calculateMetrics(
  tiktokData: TikTokRow[],
  gamData: GAMRow[],
  date: string
): Campaign[] {
  const campaigns: Campaign[] = []

  tiktokData.forEach((tiktokRow) => {
    const campanha = tiktokRow['Nome da campanha']
    const gasto = tiktokRow['Custo'] || 0
    const cpc = tiktokRow['CPC (Destino)'] || 0
    const ctr = tiktokRow['CTR (Destino)'] || 0
    const status = tiktokRow['Status principal'] as 'ATIVO' | 'PAUSADO' | 'SEM DADOS'

    // Buscar receita correspondente no GAM
    const gamRow = gamData.find(
      (row) => row['Chaves-valor'] === campanha && row['Data'] === date
    )

    const ganho = gamRow ? gamRow['Receita do Ad Exchange'] || 0 : 0
    const ecpm = gamRow ? gamRow['eCPM médio do Ad Exchange'] || 0 : 0

    const lucro_prejuizo = ganho - gasto
    const roi = gasto > 0 ? ((ganho - gasto) / gasto) * 100 : 0

    campaigns.push({
      id: crypto.randomUUID(),
      import_id: '',
      campanha,
      status,
      gasto,
      ganho,
      lucro_prejuizo,
      roi,
      cpc,
      ctr,
      ecpm,
    })
  })

  return campaigns
}

export function calculateTotals(campaigns: Campaign[]) {
  const total_gasto = campaigns.reduce((sum, c) => sum + c.gasto, 0)
  const total_ganho = campaigns.reduce((sum, c) => sum + c.ganho, 0)
  const total_lucro = total_ganho - total_gasto
  const roi_geral = total_gasto > 0 ? (total_lucro / total_gasto) * 100 : 0

  return {
    total_gasto,
    total_ganho,
    total_lucro,
    roi_geral,
  }
}

