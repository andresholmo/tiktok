// Configuração do Google Ad Manager API
export const GAM_CONFIG = {
  networkCode: process.env.GAM_NETWORK_CODE || '',
  apiVersion: 'v1',
  baseUrl: 'https://admanager.googleapis.com',
}

// Métricas do Ad Exchange que queremos
export const GAM_METRICS = [
  'AD_EXCHANGE_IMPRESSIONS',
  'AD_EXCHANGE_CLICKS', 
  'AD_EXCHANGE_CTR',
  'AD_EXCHANGE_REVENUE',
  'AD_EXCHANGE_AVERAGE_ECPM',
]

// Dimensões para relatório de campanhas
export const GAM_DIMENSIONS = [
  'DATE',
  'KEY_VALUES_NAME', // Retorna utm_campaign=VALOR
]
