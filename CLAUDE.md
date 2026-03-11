# BrandForge — Contexto para Claude Code

## Sobre o projeto
Plataforma de branding com agentes de IA especializados (BrandForge). Next.js 14 + Prisma + PostgreSQL + NextAuth.

## Repositório Git
- Repo: `marp080805-cell/Plataforma-de-Branding`
- Branch de desenvolvimento: `claude/setup-brandforge-mvp-3Xzho`
- **Sempre desenvolver e fazer push para essa branch**

## Servidor de produção
- Servidor: `root@srv1009331`
- **Path do projeto no servidor**: `/opt/brandforge/`
- **Container**: `brandforge-app-1` (imagem: `brandforge-app`)
- O projeto NÃO fica em `/home/user/Plataforma-de-Branding` no servidor — esse é apenas o path do sandbox do Claude

## Deploy
O projeto roda via Docker. As migrations do Prisma rodam automaticamente no entrypoint (`docker-entrypoint.sh`).

Para atualizar após push no git:
```bash
cd /opt/brandforge
git pull origin claude/setup-brandforge-mvp-3Xzho  # ou a branch desejada
docker compose down && docker compose up -d --build
docker compose logs -f app  # acompanhar migrations e startup
```

## Stack
- **Framework**: Next.js 14 (App Router)
- **ORM**: Prisma com PostgreSQL
- **Auth**: NextAuth.js
- **AI**: Anthropic SDK + OpenAI SDK (streaming SSE)
- **UI**: Tailwind CSS + shadcn/ui
- **Runtime**: Node.js (não Edge)

## Estrutura importante
- `/src/app/api/chat/route.ts` — rota principal de chat com IA (captura tokens)
- `/src/app/admin/` — painel admin (agentes, usuários, configurações, uso/custos)
- `/src/lib/pricing.ts` — tabela de preços por modelo para cálculo de custo
- `/prisma/schema.prisma` — schema do banco

## Providers de IA suportados
- **Anthropic**: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5, etc.
- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-5 (Responses API), etc.

## Variáveis de ambiente necessárias
Ver `.env.example` para lista completa. As API keys ficam criptografadas no banco (tabela Settings).
