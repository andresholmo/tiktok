-- Suporte a múltiplas contas TikTok: coluna advertiser_id
-- Execute no Supabase SQL Editor

-- campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS advertiser_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON campaigns(advertiser_id);

-- imports
ALTER TABLE imports ADD COLUMN IF NOT EXISTS advertiser_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_imports_advertiser_id ON imports(advertiser_id);

-- (Opcional) Migrar dados existentes: associar campanhas/imports ao advertiser_id da conta ativa do usuário
-- UPDATE campaigns c
-- SET advertiser_id = ta.advertiser_id
-- FROM imports i
-- JOIN tiktok_accounts ta ON ta.user_id = i.user_id AND ta.is_active = true
-- WHERE c.import_id = i.id
-- AND c.advertiser_id IS NULL;

-- UPDATE imports i
-- SET advertiser_id = ta.advertiser_id
-- FROM tiktok_accounts ta
-- WHERE ta.user_id = i.user_id AND ta.is_active = true
-- AND i.advertiser_id IS NULL;
