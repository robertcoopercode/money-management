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

The cloud agent VM has PostgreSQL 16 installed natively (no Docker needed).
The VM snapshot update script handles dependency installation, Prisma client
generation, migrations, and seeding automatically on startup.

### Starting services

Before running the app, ensure Postgres is running:

```bash
sudo service postgresql start
```

Then start the dev servers (see "Local development" above for commands).
API runs on `:3001`, Web on `:5173`.

### Database reset

```bash
sudo -u postgres psql -c "DROP DATABASE money_management;"
sudo -u postgres psql -c "CREATE DATABASE money_management;"
pnpm db:migrate
pnpm db:seed
```

### Caveats

- The `.env` file is created from `.env.example` by the update script (no-clobber).
  If `DATABASE_URL` is wrong or missing, check `.env` manually.
- `pnpm db:generate` must run before `pnpm db:migrate`; the update script does both.
- Quality checks: `pnpm lint`, `pnpm typecheck`, `pnpm format:check` (see root `package.json`).
- Tests: `pnpm test` runs vitest for both `apps/api` and `apps/web`.
