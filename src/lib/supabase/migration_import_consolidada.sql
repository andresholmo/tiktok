-- Migração: Adicionar colunas para importação consolidada TikTok + GAM
-- Execute este SQL no Supabase SQL Editor

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

-- Comentários para documentação
COMMENT ON COLUMN imports.start_date IS 'Data de início do período de importação';
COMMENT ON COLUMN imports.end_date IS 'Data de fim do período de importação';
COMMENT ON COLUMN imports.tiktok_spend IS 'Total gasto no TikTok';
COMMENT ON COLUMN imports.gam_faturamento_total IS 'Faturamento total TikTok no GAM';
COMMENT ON COLUMN campaigns.campaign_name IS 'Nome da campanha (normalizado)';
COMMENT ON COLUMN campaigns.tiktok_campaign_id IS 'ID da campanha no TikTok';
COMMENT ON COLUMN campaigns.profit IS 'Lucro/prejuízo calculado (receita - gasto)';

