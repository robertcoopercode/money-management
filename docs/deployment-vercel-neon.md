# Vercel + Neon Deployment Guide

This project is split into:

- `apps/web` (Vite frontend)
- `apps/api` (Hono API)

Both are deployed to Vercel as separate projects from the same repo. The database runs on Neon Postgres. The web project owns the custom domain and proxies `/api/*` requests to the API project via Vercel rewrites.

---

## 1) Create a Neon database

1. Create a new Neon project and database.
2. Copy the pooled connection string (recommended for serverless).
3. Set `DATABASE_URL` in the **API** Vercel project to that connection string.

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
pnpm --filter @ledgr/db exec prisma migrate deploy
pnpm db:seed
```

You can run this from CI or your local machine.

---

## 3) Deploy API (`apps/api`)

Create a Vercel project pointing to `apps/api`.

Suggested settings:

- Framework preset: **Other**
- Build command: configured in `apps/api/vercel.json` (runs Prisma generate + tsdown)
- Install command: leave default (`pnpm install`)

The API entry point (`src/index.ts`) exports the Hono app as a default export. The app is bundled with tsdown at build time to resolve workspace `.ts` imports (Prisma 7 and workspace packages export raw TypeScript). The built output (`dist/index.mjs`) is deployed as a serverless function.

For local development, use `pnpm dev` which runs `src/dev.ts` (a long-running server using `@hono/node-server`).

Environment variables:

- `DATABASE_URL` — Neon pooled connection string
- `AUTH_PASSWORD_HASH` — argon2 hash (generate with `pnpm hash-password`)
- `AUTH_ORIGIN` — your custom domain (e.g. `https://ledgr.app`)
- `LOG_LEVEL` (optional, e.g. `info`)

---

## 4) Deploy Web (`apps/web`)

Create a second Vercel project pointing to `apps/web`.

Suggested settings:

- Framework preset: **Vite** (auto-detected)
- Build command: leave default
- Output directory: `dist` (auto-detected)
- Install command: leave default

No environment variables needed. The web app calls relative `/api/*` paths, which are rewritten to the API project via `apps/web/vercel.json`.

---

## 5) Domain setup

The web project owns the custom domain. Add your domain in the web project's Vercel settings. The API project does not need a custom domain — it is accessed through the web project's rewrites.

After the API project deploys, update the rewrite destination in `apps/web/vercel.json` with the actual Vercel-assigned URL of the API project.

---

## 6) Verify production health

After deployment:

1. Open `<api-url>/health` and confirm `status: ok`.
2. Open your custom domain and confirm the login page loads.
3. Log in with your password and verify the session cookie is set.
4. Create a test account from the web app.
5. Create a transaction and confirm it appears in the ledger.
6. Import a sample CSV and verify matched transactions show the imported/matched indicators.

---

## Notes

- The API entry point (`src/index.ts`) is a Vercel-compatible default export. Local development uses `src/dev.ts` instead.
- `dotenv` and `loadEnvFile` are only loaded when `NODE_ENV !== "production"`. Vercel injects env vars automatically.
- `packages/db` has a `postinstall` script that runs `prisma generate` during `pnpm install`.
- The in-memory login rate limiter won't persist across serverless invocations. Consider Vercel KV or Upstash Redis for stricter rate limiting.
- Use Neon's pooled connection string to avoid exhausting database connections from serverless instances.
