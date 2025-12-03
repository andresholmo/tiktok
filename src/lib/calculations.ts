import { Campaign } from '@/types'

export interface Totals {
  totalGasto: number
  totalGanho: number
  totalLucro: number
  roiGeral: number
  campanhasAtivas: number
  campanhasPausadas: number
  campanhasSemDados: number
}

export function calculateTotals(campaigns: Campaign[]): Totals {
  // Filtrar apenas campanhas com dados completos para totais
  const campanhasCompletas = campaigns.filter(c => c.status !== 'SEM DADOS')
  
  const totalGasto = campanhasCompletas.reduce((sum, c) => sum + (c.gasto ?? 0), 0)
  const totalGanho = campanhasCompletas.reduce((sum, c) => sum + (c.ganho ?? 0), 0)
  const totalLucro = totalGanho - totalGasto
  const roiGeral = totalGasto > 0 ? ((totalGanho - totalGasto) / totalGasto) * 100 : 0

  return {
    totalGasto,
    totalGanho,
    totalLucro,
    roiGeral,
    campanhasAtivas: campaigns.filter(c => c.status === 'ATIVO').length,
    campanhasPausadas: campaigns.filter(c => c.status === 'PAUSADO').length,
    campanhasSemDados: campaigns.filter(c => c.status === 'SEM DADOS').length,
  }
}

// Cores baseadas nos valores (para uso no frontend)
export function getROIColor(roi: number): string {
  if (roi >= 15) return 'bg-green-500'
  if (roi >= 0) return 'bg-green-200'
  if (roi >= -30) return 'bg-yellow-200'
  return 'bg-red-200'
}

export function getCPCColor(cpc: number): string {
  if (cpc <= 0.85) return 'bg-green-200'
  if (cpc <= 1.0) return 'bg-yellow-200'
  return 'bg-red-200'
}

export function getCTRColor(ctr: number): string {
  if (ctr >= 0.05) return 'bg-green-200'
  if (ctr >= 0.03) return 'bg-yellow-200'
  return 'bg-red-200'
}

export function getECPMColor(ecpm: number): string {
  if (ecpm >= 900) return 'bg-green-500'
  if (ecpm >= 700) return 'bg-green-200'
  if (ecpm >= 500) return 'bg-yellow-200'
  if (ecpm > 0) return 'bg-red-200'
  return 'bg-gray-200'
}

export function getLucroColor(lucro: number): string {
  if (lucro > 0) return 'bg-green-200'
  if (lucro < 0) return 'bg-red-200'
  return 'bg-gray-100'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ATIVO': return 'bg-green-100 text-green-800'
    case 'PAUSADO': return 'bg-yellow-100 text-yellow-800'
    case 'SEM DADOS': return 'bg-gray-200 text-gray-600'
    default: return 'bg-gray-100'
  }
}
