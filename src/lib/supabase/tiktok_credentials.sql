-- Tabela para armazenar credenciais do TikTok
CREATE TABLE IF NOT EXISTS tiktok_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  advertiser_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE tiktok_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas credenciais" ON tiktok_credentials
  FOR ALL USING (auth.uid() = user_id);

