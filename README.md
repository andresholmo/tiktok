# Dashboard de Arbitragem TikTok Ads

Dashboard para comparar gastos do TikTok Ads com receitas do Google Ad Manager.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (auth + database)
- Tailwind CSS
- Shadcn/ui para componentes

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuração

1. Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

2. Configure o banco de dados no Supabase conforme necessário.

## Scripts

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia servidor de produção
- `npm run commit "mensagem"` - Adiciona, commita e envia mensagem
- `npm run push` - Faz push para o repositório
- `npm run save` - Auto-save (add, commit e push)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
