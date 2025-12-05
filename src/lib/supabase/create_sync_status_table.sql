-- Criar tabela para armazenar status da última sincronização
CREATE TABLE IF NOT EXISTS sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sync_type VARCHAR(20) DEFAULT 'manual', -- 'manual' ou 'cron'
  status VARCHAR(20) DEFAULT 'success', -- 'success' ou 'error'
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_sync_status_user_id ON sync_status(user_id);

