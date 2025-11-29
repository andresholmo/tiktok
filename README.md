# Dashboard de Arbitragem TikTok/GAM

Dashboard para análise de ROI de campanhas de arbitragem de tráfego.

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth)
- **Deploy:** Vercel

## Funcionalidades

- ✅ Upload de relatórios TikTok Ads (XLSX) e GAM (CSV)
- ✅ Cruzamento automático por nome de campanha
- ✅ Cálculo de ROI, lucro/prejuízo por campanha
- ✅ Dashboard com métricas e tabela colorida
- ✅ Histórico de importações
- ✅ Autenticação de usuários

## Métricas Calculadas

| Métrica | Fórmula |
|---------|---------|
| ROI | ((Ganho - Gasto) / Gasto) × 100 |
| Lucro/Prejuízo | Ganho - Gasto |

## Cores da Tabela

| Coluna | Verde | Amarelo | Vermelho |
|--------|-------|---------|----------|
| ROI | ≥ 0% | ≥ -30% | < -30% |
| CPC | ≤ R$0,85 | ≤ R$1,00 | > R$1,00 |
| CTR | ≥ 5% | ≥ 3% | < 3% |
| eCPM | ≥ R$700 | ≥ R$500 | < R$500 |

## Setup Local

1. Clone o repositório
2. Instale dependências: `npm install`
3. Configure `.env.local` com credenciais do Supabase
4. Execute: `npm run dev`

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

## Deploy

O projeto está configurado para deploy automático na Vercel.
