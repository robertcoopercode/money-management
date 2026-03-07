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

## Cursor Cloud specific instructions

The cloud agent VM has Postgres installed natively (no Docker) via the
snapshot. Environment variables (including `DATABASE_URL`) are injected as
secrets — no `.env` file is needed.

The snapshot update script handles `pnpm install` and `pnpm db:generate`.
Before starting dev servers, you must apply migrations and seed:

```bash
sudo service postgresql start   # usually already running from snapshot
pnpm db:migrate                 # apply any pending schema migrations
pnpm db:seed                    # idempotent — safe to re-run
pnpm dev:api                    # API on :3001
pnpm dev:web                    # Web on :5173
```

Payees must be created (via the Payees tab) before they appear in the
transaction entry dropdown.

If you need to reset the database:

```bash
sudo -u postgres psql -c "DROP DATABASE money_management;"
sudo -u postgres psql -c "CREATE DATABASE money_management;"
pnpm db:migrate
pnpm db:seed
```
