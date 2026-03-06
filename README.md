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
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

### Database options

- **Option A (local Docker Postgres):**
  - `docker compose up -d`
- **Option B (Neon):**
  - set `DATABASE_URL` in `.env` to your Neon connection string.

If `DATABASE_URL` is missing, API database actions will fail.

## Deployment

See [docs/deployment-vercel-neon.md](docs/deployment-vercel-neon.md).
