-- ============================================
-- SCRIPT DE VERIFICAÇÃO DO SCHEMA
-- ============================================
-- Execute este SQL no Supabase SQL Editor para verificar quais colunas existem

-- Verificar colunas da tabela imports
SELECT 
  'imports' as tabela,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'imports'
ORDER BY ordinal_position;

-- Verificar colunas da tabela campaigns
SELECT 
  'campaigns' as tabela,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;

-- Verificar se as colunas necessárias existem
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'imports' AND column_name = 'end_date'
    ) THEN '✓ end_date existe em imports'
    ELSE '✗ end_date NÃO existe em imports'
  END as status_end_date,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'imports' AND column_name = 'start_date'
    ) THEN '✓ start_date existe em imports'
    ELSE '✗ start_date NÃO existe em imports'
  END as status_start_date,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'campaigns' AND column_name = 'campaign_name'
    ) THEN '✓ campaign_name existe em campaigns'
    ELSE '✗ campaign_name NÃO existe em campaigns'
  END as status_campaign_name;

