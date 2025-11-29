-- Adicionar colunas de faturamento TikTok, Lucro Real e ROI Real
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE imports 
ADD COLUMN IF NOT EXISTS faturamento_tiktok DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_real DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS roi_real DECIMAL(8,2) DEFAULT 0;

