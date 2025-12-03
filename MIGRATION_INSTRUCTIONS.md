# Instruções de Migração - Importação Consolidada

## ⚠️ IMPORTANTE: Execute a migração SQL antes de usar a funcionalidade!

## Passo 1: Verificar Schema Atual (Opcional)

Antes de executar a migração, você pode verificar quais colunas já existem:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `src/lib/supabase/verificar_schema.sql`

Isso mostrará todas as colunas atuais das tabelas `imports` e `campaigns`.

## Passo 2: Executar Migração SQL no Supabase

**OBRIGATÓRIO:** Antes de usar a funcionalidade de Importação Consolidada, você precisa executar a migração SQL no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `src/lib/supabase/migration_import_consolidada_completa.sql`

Este script:
- ✅ Verifica se cada coluna existe antes de adicionar (seguro para executar múltiplas vezes)
- ✅ Adiciona todas as colunas necessárias nas tabelas `imports` e `campaigns`
- ✅ Cria índices para melhor performance
- ✅ Mostra um resumo das colunas adicionadas ao final

## Passo 3: Verificar Migração

Após executar a migração, execute novamente o script de verificação (`verificar_schema.sql`) para confirmar que todas as colunas foram adicionadas.

Você deve ver:
- ✓ `start_date` e `end_date` em `imports`
- ✓ `campaign_name` em `campaigns`
- ✓ Todas as outras colunas TikTok e GAM

## Passo 4: Testar a Funcionalidade

Após executar a migração:

1. Acesse a página de Importação (`/importar`)
2. Use o componente **"Importação Consolidada + ROI"**
3. Selecione as datas desejadas
4. Clique em **"Importar TikTok + GAM e Calcular ROI"**

O sistema irá:
- Buscar dados do TikTok (gastos, impressões, cliques)
- Buscar dados do GAM (receita, faturamento total, impressões, cliques)
- Cruzar campanhas por nome
- Calcular ROI e lucro/prejuízo
- Salvar tudo no banco de dados

## Resolução de Problemas

### Erro: "Could not find the 'end_date' column"

Este erro significa que a migração SQL não foi executada. Siga os passos acima.

### Erro: "column does not exist"

A API agora detecta automaticamente se as colunas não existem e fornece uma mensagem de erro clara indicando qual arquivo de migração executar.

### A API funciona mesmo sem a migração?

A API foi atualizada para ser mais resiliente e tentar funcionar com as colunas antigas, mas **recomendamos fortemente executar a migração** para ter acesso a todas as funcionalidades.

## Notas

- ✅ A migração é **não-destrutiva**: apenas adiciona novas colunas
- ✅ Os campos antigos são mantidos para compatibilidade
- ✅ O script pode ser executado múltiplas vezes sem problemas
- ✅ A API tenta funcionar mesmo sem as colunas novas, mas com funcionalidade limitada

