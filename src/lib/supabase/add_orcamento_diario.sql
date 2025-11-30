-- Adicionar coluna orcamento_diario na tabela campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS orcamento_diario DECIMAL(12,2) DEFAULT 0;

