export interface Import {
  id: string
  user_id: string
  date: string
  created_at: string
  
  // Campos antigos (manter para compatibilidade)
  total_gasto?: number
  total_ganho?: number
  total_lucro?: number
  roi_geral?: number
  faturamento_tiktok?: number
  lucro_real?: number
  roi_real?: number
  
  // Período
  start_date?: string
  end_date?: string
  imported_at?: string
  
  // TikTok
  tiktok_spend?: number
  tiktok_impressions?: number
  tiktok_clicks?: number
  
  // GAM
  gam_revenue?: number
  gam_faturamento_total?: number
  gam_impressions?: number
  gam_clicks?: number
  
  // Calculados
  roi?: number
  profit?: number
  
  updated_at?: string
}

export interface Campaign {
  id: string
  import_id: string
  campanha: string
  status: 'ATIVO' | 'PAUSADO' | 'SEM DADOS' | 'ENABLE' | 'DISABLE' | string
  
  // Campos antigos (manter para compatibilidade)
  gasto?: number
  ganho?: number
  lucro_prejuizo?: number
  roi?: number
  cpc?: number
  ctr?: number
  ecpm?: number
  orcamento_diario?: number
  
  // Campos novos
  campaign_name?: string
  campaign_date?: string
  
  // TikTok
  tiktok_campaign_id?: string
  tiktok_spend?: number
  tiktok_impressions?: number
  tiktok_clicks?: number
  tiktok_ctr?: number
  tiktok_cpc?: number
  tiktok_status?: string
  
  // GAM
  gam_revenue?: number
  gam_impressions?: number
  gam_clicks?: number
  gam_ctr?: number
  gam_ecpm?: number
  
  // Calculados
  profit?: number
  
  created_at: string
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
