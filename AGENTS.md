# AGENTS.md

## Project overview

Money Management is a YNAB-inspired budgeting app built as a pnpm workspace monorepo:

- `apps/web`: React + Vite frontend
- `apps/api`: Hono + Effect backend
- `packages/db`: Prisma schema/client + seed script
- `packages/shared`: shared validation + money utilities

## Local development

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start local Postgres:

```bash
docker compose up -d
```

3. Install dependencies and generate Prisma client:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

4. Run backend and frontend:

```bash
pnpm dev:api
pnpm dev:web
```

Frontend runs on `http://localhost:5173`, API on `http://localhost:3001`.

### Alternative DB setup (without Docker)

If Docker is not available, use a Neon connection string in `.env`:

```env
DATABASE_URL="postgresql://..."
```

Then run:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Quality commands

- `pnpm lint` — oxlint
- `pnpm typecheck` — tsgo across workspace packages
- `pnpm format` — oxfmt write mode
- `pnpm format:check` — oxfmt check mode

## Notes

- CSV importer expects headers `date,amount,payee,note` in default flow.
- Amounts are stored as integer cents (`amountMinor`) with positive inflow and negative outflow.
- Budget planning uses month keys in `YYYY-MM` format.
- Deployment notes live in `docs/deployment-vercel-neon.md`.
