# Configuração de Autenticação no Supabase

## Passo 1: Acessar o Supabase Dashboard

1. Vá em Authentication > Providers
2. Certifique-se que "Email" está habilitado

## Passo 2: Configurar Site URL

1. Vá em Authentication > URL Configuration
2. Configure Site URL: sua URL de produção (ou http://localhost:3000 para dev)

## Passo 3: Desabilitar confirmação de email (opcional, para testes)

1. Vá em Authentication > Providers > Email
2. Desmarque "Confirm email" para facilitar testes

## Passo 4: Criar primeiro usuário

1. Acesse /login no navegador
2. Clique em "Não tem conta? Cadastre-se"
3. Preencha email e senha
4. Se confirmação de email estiver ativa, verifique seu email

