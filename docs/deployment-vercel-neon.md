# Vercel + Neon Deployment Guide

This project is split into:

- `apps/web` (Vite frontend)
- `apps/api` (Hono API)

Both can be deployed to Vercel. The database is expected to run on Neon Postgres.

---

## 1) Create a Neon database

1. Create a new Neon project and database.
2. Copy the pooled connection string (recommended for serverless).
3. Set `DATABASE_URL` in Vercel to that connection string.

Example:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
```

---

## 2) Apply Prisma migrations

Before production traffic, run migrations once against Neon:

```bash
pnpm install
pnpm db:generate
pnpm --filter @money/db exec prisma migrate deploy
pnpm db:seed
```

You can run this from CI or your local machine.

---

## 3) Deploy API (`apps/api`)

Create a Vercel project pointing to `apps/api`.

Suggested settings:

- Framework preset: **Other**
- Build command: `pnpm --filter @money/api build`
- Output directory: _(none required for node runtime)_
- Install command: `pnpm install`

Environment variables:

- `DATABASE_URL`
- `API_PORT` (optional on Vercel)
- `LOG_LEVEL` (optional, e.g. `info`)

---

## 4) Deploy Web (`apps/web`)

Create a second Vercel project pointing to `apps/web`.

Suggested settings:

- Framework preset: **Vite**
- Build command: `pnpm --filter @money/web build`
- Output directory: `apps/web/dist`
- Install command: `pnpm install`

Environment variables:

- `VITE_API_URL` set to deployed API URL (e.g. `https://money-api.vercel.app`)

---

## 5) Verify production health

After deployment:

1. Open `<api-url>/health` and confirm `status: ok`.
2. Create a test account from the web app.
3. Create a transaction and confirm it appears in the ledger.
4. Import a sample CSV and verify matched transactions show the imported/matched indicators.

---

## Notes

- The API now logs request IDs and includes them in error payloads for easier production debugging.
- If your API and web are in separate domains, keep CORS configured accordingly.
