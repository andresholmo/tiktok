-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de importações
CREATE TABLE imports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_gasto DECIMAL(12,2) DEFAULT 0,
  total_ganho DECIMAL(12,2) DEFAULT 0,
  total_lucro DECIMAL(12,2) DEFAULT 0,
  roi_geral DECIMAL(8,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de campanhas
CREATE TABLE campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  import_id UUID REFERENCES imports(id) ON DELETE CASCADE,
  campanha TEXT NOT NULL,
  status TEXT CHECK (status IN ('ATIVO', 'PAUSADO', 'SEM DADOS')) DEFAULT 'SEM DADOS',
  gasto DECIMAL(12,2) DEFAULT 0,
  ganho DECIMAL(12,2) DEFAULT 0,
  lucro_prejuizo DECIMAL(12,2) DEFAULT 0,
  roi DECIMAL(8,2) DEFAULT 0,
  cpc DECIMAL(8,2) DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  ecpm DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_imports_date ON imports(date DESC);
CREATE INDEX idx_imports_user ON imports(user_id);
CREATE INDEX idx_campaigns_import ON campaigns(import_id);
CREATE INDEX idx_campaigns_campanha ON campaigns(campanha);

-- RLS (Row Level Security)
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (usuário só vê seus próprios dados)
CREATE POLICY "Usuário vê suas importações" ON imports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuário vê suas campanhas" ON campaigns
  FOR ALL USING (
    import_id IN (SELECT id FROM imports WHERE user_id = auth.uid())
  );

-- View para relatório consolidado
CREATE VIEW campaign_report AS
SELECT 
  c.*,
  i.date as import_date,
  i.user_id
FROM campaigns c
JOIN imports i ON c.import_id = i.id;

