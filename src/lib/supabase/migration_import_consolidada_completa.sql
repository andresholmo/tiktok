-- ============================================
-- MIGRAÇÃO COMPLETA: Importação Consolidada
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- Este script adiciona todas as colunas necessárias para a funcionalidade de importação consolidada

-- ============================================
-- PARTE 1: Adicionar colunas na tabela imports
-- ============================================

-- Verificar e adicionar colunas de período
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'start_date') THEN
    ALTER TABLE imports ADD COLUMN start_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'end_date') THEN
    ALTER TABLE imports ADD COLUMN end_date DATE;
  END IF;
END $$;

-- Adicionar colunas TikTok (com IF NOT EXISTS via DO block)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'tiktok_spend') THEN
    ALTER TABLE imports ADD COLUMN tiktok_spend DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'tiktok_impressions') THEN
    ALTER TABLE imports ADD COLUMN tiktok_impressions BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'tiktok_clicks') THEN
    ALTER TABLE imports ADD COLUMN tiktok_clicks BIGINT DEFAULT 0;
  END IF;
END $$;

-- Adicionar colunas GAM
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'gam_revenue') THEN
    ALTER TABLE imports ADD COLUMN gam_revenue DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'gam_faturamento_total') THEN
    ALTER TABLE imports ADD COLUMN gam_faturamento_total DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'gam_impressions') THEN
    ALTER TABLE imports ADD COLUMN gam_impressions BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'gam_clicks') THEN
    ALTER TABLE imports ADD COLUMN gam_clicks BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imports' AND column_name = 'profit') THEN
    ALTER TABLE imports ADD COLUMN profit DECIMAL(12,2);
  END IF;
END $$;

-- ============================================
-- PARTE 2: Adicionar colunas na tabela campaigns
-- ============================================

-- Adicionar colunas básicas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'campaign_name') THEN
    ALTER TABLE campaigns ADD COLUMN campaign_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'campaign_date') THEN
    ALTER TABLE campaigns ADD COLUMN campaign_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'tiktok_campaign_id') THEN
    ALTER TABLE campaigns ADD COLUMN tiktok_campaign_id TEXT;
  END IF;
END $$;

-- Adicionar colunas TikTok
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'tiktok_spend') THEN
    ALTER TABLE campaigns ADD COLUMN tiktok_spend DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'tiktok_impressions') THEN
    ALTER TABLE campaigns ADD COLUMN tiktok_impressions BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'tiktok_clicks') THEN
    ALTER TABLE campaigns ADD COLUMN tiktok_clicks BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'tiktok_ctr') THEN
    ALTER TABLE campaigns ADD COLUMN tiktok_ctr DECIMAL(8,4) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'tiktok_cpc') THEN
    ALTER TABLE campaigns ADD COLUMN tiktok_cpc DECIMAL(8,2) DEFAULT 0;
  END IF;
END $$;

-- Adicionar colunas GAM
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'gam_revenue') THEN
    ALTER TABLE campaigns ADD COLUMN gam_revenue DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'gam_impressions') THEN
    ALTER TABLE campaigns ADD COLUMN gam_impressions BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'gam_clicks') THEN
    ALTER TABLE campaigns ADD COLUMN gam_clicks BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'gam_ctr') THEN
    ALTER TABLE campaigns ADD COLUMN gam_ctr DECIMAL(8,4) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'gam_ecpm') THEN
    ALTER TABLE campaigns ADD COLUMN gam_ecpm DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'profit') THEN
    ALTER TABLE campaigns ADD COLUMN profit DECIMAL(12,2);
  END IF;
END $$;

-- ============================================
-- PARTE 3: Criar índices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_imports_start_end_date ON imports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_name ON campaigns(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_date ON campaigns(campaign_date);

-- ============================================
-- PARTE 4: Verificação final
-- ============================================

-- Mostrar colunas adicionadas
SELECT 
  'imports' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'imports' 
  AND column_name IN ('start_date', 'end_date', 'tiktok_spend', 'tiktok_impressions', 'tiktok_clicks', 
                      'gam_revenue', 'gam_faturamento_total', 'gam_impressions', 'gam_clicks', 'profit')
ORDER BY column_name;

SELECT 
  'campaigns' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
  AND column_name IN ('campaign_name', 'campaign_date', 'tiktok_campaign_id', 
                      'tiktok_spend', 'tiktok_impressions', 'tiktok_clicks', 'tiktok_ctr', 'tiktok_cpc',
                      'gam_revenue', 'gam_impressions', 'gam_clicks', 'gam_ctr', 'gam_ecpm', 'profit')
ORDER BY column_name;

