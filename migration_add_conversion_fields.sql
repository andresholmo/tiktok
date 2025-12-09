-- Adicionar colunas de conversão na tabela campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conversions NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost_per_conversion NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC DEFAULT 0;

