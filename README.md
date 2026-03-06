# money-management

YNAB-inspired budgeting application built with:

- TypeScript + React + Vite
- Hono + Effect
- Prisma + PostgreSQL (Neon-ready)
- Base UI, visx, sonner
- Pino logging
- Oxlint + tsgo + oxfmt

## Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:web
```
