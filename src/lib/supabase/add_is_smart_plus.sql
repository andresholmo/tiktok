-- Adicionar coluna is_smart_plus na tabela campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_smart_plus BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN campaigns.is_smart_plus IS 'Indica se a campanha é Smart Plus (não editável via API)';

