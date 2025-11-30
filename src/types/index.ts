export interface Import {
  id: string
  date: string
  created_at: string
  total_gasto: number
  total_ganho: number
  total_lucro: number
  roi_geral: number
  faturamento_tiktok: number
  lucro_real: number
  roi_real: number
}

export interface Campaign {
  id: string
  import_id: string
  campanha: string
  status: 'ATIVO' | 'PAUSADO' | 'SEM DADOS'
  gasto: number
  ganho: number
  lucro_prejuizo: number
  roi: number
  cpc: number
  ctr: number
  ecpm: number
  orcamento_diario: number
}

export interface TikTokRow {
  'Nome da campanha': string
  'Status principal': string
  'Custo': number
  'CPC (Destino)': number
  'CTR (Destino)': number
  'Orçamento da campanha': number
}

export interface GAMRow {
  'Data': string
  'Chaves-valor': string
  'Receita do Ad Exchange': number
  'eCPM médio do Ad Exchange': number
}
