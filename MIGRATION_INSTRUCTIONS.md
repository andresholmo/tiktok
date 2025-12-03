# Instruções de Migração - Importação Consolidada

## Passo 1: Executar Migração SQL no Supabase

Antes de usar a funcionalidade de Importação Consolidada, você precisa executar a migração SQL no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `src/lib/supabase/migration_import_consolidada.sql`

Ou copie e cole o seguinte SQL:

```sql
-- Migração: Adicionar colunas para importação consolidada TikTok + GAM

-- Adicionar colunas na tabela imports para suportar período e dados separados
ALTER TABLE imports 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS tiktok_spend DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_impressions BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_clicks BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_revenue DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_faturamento_total DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_impressions BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_clicks BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit DECIMAL(12,2);

-- Adicionar colunas na tabela campaigns para dados separados TikTok e GAM
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS campaign_date DATE,
  ADD COLUMN IF NOT EXISTS tiktok_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_spend DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_impressions BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_clicks BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_ctr DECIMAL(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_cpc DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_revenue DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_impressions BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_clicks BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_ctr DECIMAL(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gam_ecpm DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit DECIMAL(12,2);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_imports_start_end_date ON imports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_name ON campaigns(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_date ON campaigns(campaign_date);
```

## Passo 2: Testar a Funcionalidade

Após executar a migração:

1. Acesse a página de Importação (`/importar`)
2. Use o componente **"Importação Consolidada + ROI"**
3. Selecione as datas desejadas
4. Clique em **"Importar TikTok + GAM e Calcular ROI"**

O sistema irá:
- Buscar dados do TikTok (gastos, impressões, cliques)
- Buscar dados do GAM (receita, faturamento total, impressões, cliques)
- Cruzar campanhas por nome
- Calcular ROI e lucro/prejuízo
- Salvar tudo no banco de dados

## Notas

- A migração é **não-destrutiva**: apenas adiciona novas colunas
- Os campos antigos são mantidos para compatibilidade
- A funcionalidade funciona mesmo se algumas colunas não existirem (usando valores padrão)

