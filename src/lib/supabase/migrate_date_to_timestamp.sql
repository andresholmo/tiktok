-- Alterar coluna date para timestamp
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE imports 
ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE 
USING date::timestamp with time zone;

