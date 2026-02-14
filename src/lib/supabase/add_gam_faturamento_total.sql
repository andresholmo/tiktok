-- Garantir coluna gam_faturamento_total na tabela imports (faturamento GAM total por período)
-- Execute no Supabase SQL Editor

ALTER TABLE imports ADD COLUMN IF NOT EXISTS gam_faturamento_total NUMERIC(12,2) DEFAULT 0;
