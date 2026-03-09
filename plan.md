# Vercel Deployment Plan for Ledgr Monorepo

## Overview

Deploy the Ledgr monorepo as **two Vercel projects** from the same GitHub repo. This is Vercel's recommended approach for monorepos and requires no architectural changes to the codebase.

- **Project 1 (`ledgr-web`)**: Vite React frontend — owns the custom domain
- **Project 2 (`ledgr-api`)**: Hono API backend — runs as serverless functions

---

## Domain Strategy

### Recommended: Single Domain with Path Rewrites

The web project owns the domain (e.g. `ledgr.app`). All `/api/*` requests are rewritten at Vercel's edge to the API project. The browser never sees a different origin.

```
ledgr.app          → serves the Vite SPA (ledgr-web project)
ledgr.app/api/*    → rewritten to ledgr-api project (transparent proxy)
```

**Why this approach:**
- No CORS needed (same origin from the browser's perspective)
- The web app already calls relative `/api/*` paths — zero frontend changes
- Rewrites happen at Vercel's edge network, adding negligible latency
- Session cookies work seamlessly (same domain, no cross-origin cookie issues)
- CSRF origin check works naturally (`AUTH_ORIGIN` matches the single domain)
- Preview deployments stay self-contained (use Vercel's Related Projects feature)

### Alternative: Subdomain Approach

```
ledgr.app           → web project
api.ledgr.app       → api project
```

Not recommended for this project because:
- Requires CORS with `credentials: true` for session cookies
- Session cookies need `domain=.ledgr.app` to work across subdomains
- CSRF middleware needs to allow the web origin separately
- The web app already uses relative `/api/*` paths

---

## Step-by-Step Deployment

### Step 1: Prepare the API for Vercel Serverless ✅

The current entry point (`apps/api/src/index.ts`) uses `@hono/node-server` with `serve()`, which starts a long-running server. Vercel serverless needs a default export instead.

**Create `apps/api/src/index.ts` (replace current):**
```ts
import { handle } from "hono/vercel"
import { app } from "./app.js"

export default handle(app)
```

The entry point uses `hono/vercel`'s `handle()` adapter. The app is bundled with `tsup` at build time to resolve workspace `.ts` imports (Prisma 7 and workspace packages export raw TypeScript which Node.js can't import directly). Prisma runtime deps are externalized since they ship as JS in `node_modules`.

**Create `apps/api/tsup.config.ts`:**
```ts
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  noExternal: ["@ledgr/db", "@ledgr/shared"],
  external: [/^@prisma\/client/, /^@prisma\/adapter-pg/, /^pg$/],
})
```

**Create `apps/api/vercel.json`:**
```json
{
  "buildCommand": "cd ../.. && pnpm --filter @ledgr/db db:generate && pnpm --filter @ledgr/api build",
  "functions": {
    "dist/index.js": {
      "runtime": "@vercel/node@latest"
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/dist/index.js" }
  ]
}
```

**Create `apps/api/src/dev.ts` (for local development):**
```ts
import "./env.js"
import { serve } from "@hono/node-server"
import { app } from "./app.js"
import { apiLogger } from "./lib/logger.js"

const port = Number(process.env.API_PORT ?? 3001)

serve(
  { fetch: app.fetch, port },
  (info) => {
    apiLogger.info(`API listening on http://localhost:${info.port}`)
  },
)
```

**Update `apps/api/package.json` scripts:**
```json
"scripts": {
  "dev": "tsx watch src/dev.ts",
  "build": "tsup",
  "start": "tsx src/dev.ts"
}
```

### Step 2: Ensure Prisma Generates at Build Time ✅

Add a `postinstall` script to `packages/db/package.json`:

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

This ensures Vercel generates the Prisma client during `pnpm install`, before the build step runs.

### Step 3: Add `vercel.json` to the Web App ✅

Create `apps/web/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://ledgr-api.vercel.app/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Notes:**
- The first rule proxies `/api/*` to the API project. Replace `ledgr-api.vercel.app` with the actual Vercel-assigned URL of the API project.
- The second rule is the SPA catch-all for React Router (without this, refreshing on any non-root route like `/login` returns 404).
- Order matters — first match wins, so the API rewrite must come before the catch-all.

### Step 4: Conditionally Load dotenv ✅

Update `apps/api/src/env.ts` so dotenv only loads in development (Vercel injects env vars automatically in production):

```ts
if (process.env.NODE_ENV !== "production") {
  // load .env for local development
  const dotenv = await import("dotenv")
  dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") })
}
```

Same for `packages/db/src/env.ts` if it loads dotenv.

### Step 5: Configure Auth for Production ✅ (no code changes — set env vars in Vercel dashboard)

The app uses password-only authentication with session cookies and CSRF protection. These need specific configuration for the rewrite-based deployment:

**`AUTH_ORIGIN`** — The CSRF middleware (`apps/api/src/middleware/csrf.ts`) checks that the `Origin` header on mutating requests matches `AUTH_ORIGIN`. With the path rewrite approach, set this to the custom domain:

```
AUTH_ORIGIN=https://ledgr.app
```

**`AUTH_PASSWORD_HASH`** — Generate with `pnpm hash-password` (uses argon2). Set this in Vercel's environment variables for the API project.

**Session cookies** — The auth routes set an `httpOnly` cookie with `secure: true` in production (`NODE_ENV=production`) and `sameSite: "Lax"`. With the rewrite approach, the cookie domain is the web project's domain (`ledgr.app`), which works perfectly since both the SPA and API responses appear to come from the same origin.

**Rate limiting caveat** — The login rate limiter uses an in-memory `Map`. In Vercel serverless, each function invocation may run in a different instance, so the rate limiter won't be persistent across invocations. This is acceptable for basic protection but consider an external store (e.g. Vercel KV / Upstash Redis) if stricter rate limiting is needed.

### Step 6: Create the API Project on Vercel (manual — Vercel dashboard)

1. Go to Vercel Dashboard → "Add New Project"
2. Import `robertcoopercode/money-management`
3. Configure:
   - **Project Name:** `ledgr-api`
   - **Root Directory:** `apps/api`
   - **Framework Preset:** Other
   - **Build Command:** configured in `vercel.json` (runs Prisma generate + tsup)
   - **Install Command:** leave default (`pnpm install` auto-detected)
4. Set environment variables:
   - `DATABASE_URL` — Neon pooled connection string
   - `AUTH_PASSWORD_HASH` — argon2 hash from `pnpm hash-password`
   - `AUTH_ORIGIN` — `https://ledgr.app` (your custom domain)
   - `LOG_LEVEL` — `info` (optional)
5. Deploy

### Step 7: Create the Web Project on Vercel (manual — Vercel dashboard)

1. Go to Vercel Dashboard → "Add New Project"
2. Import the same repo `robertcoopercode/money-management`
3. Configure:
   - **Project Name:** `ledgr-web`
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** leave default
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** leave default
4. No environment variables needed (API calls use relative `/api/*` paths, rewritten via `vercel.json`)
5. Deploy

### Step 8: Update the Rewrite URL (manual — after API deploys)

After the API project deploys, Vercel assigns it a URL (e.g. `ledgr-api.vercel.app`). Update `apps/web/vercel.json` to use this URL in the rewrite destination. Commit and push — the web project will redeploy.

### Step 9: Assign Custom Domain (manual — Vercel dashboard + DNS)

1. In the **web project** settings → Domains → Add `ledgr.app` (or your domain)
2. Configure DNS: Add a CNAME record pointing to `cname.vercel-dns.com`
3. Vercel automatically provisions an SSL certificate
4. The API project does NOT need a custom domain — it's accessed through the web project's rewrites

### Step 10: Set Up Related Projects (optional — Vercel dashboard)

When you open a PR, Vercel creates preview deployments for both projects. By default, the web preview still rewrites to the **production** API. To make preview deployments reference each other:

Add to `apps/web/vercel.json`:
```json
{
  "relatedProjects": [
    { "name": "ledgr-api" }
  ]
}
```

Then use `@vercel/related-projects` in a build plugin or update the rewrite destination dynamically. Alternatively, just use the production API for previews (simpler, and usually fine).

---

## What Changes in the Codebase

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Replace `serve()` with `handle(app)` using `hono/vercel` adapter |
| `apps/api/src/dev.ts` | New file — local dev server using `@hono/node-server` |
| `apps/api/package.json` | Update `dev`/`start` scripts to `dev.ts`, `build` to `tsup` |
| `apps/api/tsup.config.ts` | New file — bundles API with workspace packages inlined |
| `apps/api/vercel.json` | New file — build command, serverless function config, rewrites |
| `apps/api/src/env.ts` | Conditionally load dotenv (skip in production) |
| `apps/web/vercel.json` | New file — rewrites for API proxy + SPA catch-all |
| `packages/db/package.json` | Add `postinstall` script for `prisma generate` |
| `packages/db/src/env.ts` | Conditionally load dotenv (skip in production) |

---

## Environment Variables Summary

### API Project (Vercel)
| Variable | Required | Value |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `AUTH_PASSWORD_HASH` | Yes | argon2 hash (from `pnpm hash-password`) |
| `AUTH_ORIGIN` | Yes | `https://ledgr.app` (custom domain) |
| `LOG_LEVEL` | No | `info` |
| `NODE_ENV` | Auto | Set by Vercel to `production` |

### Web Project (Vercel)
| Variable | Required | Value |
|----------|----------|-------|
| (none) | — | API accessed via relative paths + rewrites |

---

## How Builds Work

On every push to `main`:

1. Vercel detects both projects are linked to this repo
2. It checks which workspace packages changed (using the dependency graph from `pnpm-workspace.yaml`)
3. If only `apps/web` changed → only `ledgr-web` rebuilds
4. If `packages/shared` changed → both projects rebuild (both depend on it)
5. If `packages/db` changed → only `ledgr-api` rebuilds (only it depends on `@ledgr/db`)

Each project runs `pnpm install` at the repo root (resolving workspace links), then runs the build in its root directory.

---

## Database Migrations

Vercel does **not** run migrations automatically. Before the first production deployment:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @ledgr/db exec prisma migrate deploy
DATABASE_URL="postgresql://..." pnpm db:seed
```

For subsequent schema changes, run `prisma migrate deploy` as part of CI or manually before deploying.

---

## Request Flow in Production

### Authenticated API Request
```
Browser → ledgr.app/api/accounts
       → Vercel Edge (web project)
       → Rewrite to ledgr-api.vercel.app/api/accounts
       → CSRF check (Origin header matches AUTH_ORIGIN for POST/PATCH/DELETE)
       → Auth middleware (validates session cookie)
       → Hono route handler
       → Neon PostgreSQL
       → Response (with Set-Cookie if session refreshed)
```

### Login Flow
```
Browser → ledgr.app/api/auth/login   (POST with password)
       → Vercel Edge (web project)
       → Rewrite to ledgr-api.vercel.app/api/auth/login
       → CSRF check (Origin header)
       → Auth middleware skips (public path)
       → Argon2 password verification
       → Creates session in DB, sets httpOnly cookie
       → Response with Set-Cookie: session=<token>
```

### SPA Navigation
```
Browser → ledgr.app/transactions
       → Vercel Edge (web project)
       → SPA catch-all → serves index.html
       → React Router handles client-side routing
```

---

## Serverless Considerations

- **Cold starts**: Hono on Vercel serverless has minimal cold start times. Prisma client initialization adds some overhead on the first invocation.
- **Session rate limiter**: The in-memory login rate limiter (`Map`) in `apps/api/src/routes/auth.ts` won't persist across serverless invocations. Each instance gets its own map. For stronger rate limiting, use Vercel KV or Upstash Redis.
- **Connection pooling**: Use Neon's pooled connection string (with pgBouncer) to avoid exhausting database connections from multiple serverless instances.
- **Session cleanup**: `deleteExpiredSessions()` is called during login. In serverless, consider a Vercel Cron Job to periodically clean up expired sessions.

---

## Verification Checklist

After deploying both projects:

- [ ] `ledgr-api.vercel.app/health` returns `{ status: "ok" }`
- [ ] `ledgr.app` loads the React app and shows the login page
- [ ] Logging in with the correct password sets a session cookie and redirects to the app
- [ ] `ledgr.app/api/accounts` returns data when authenticated (proxied to API)
- [ ] `ledgr.app/api/accounts` returns 401 when not authenticated
- [ ] Creating an account from the UI works
- [ ] Refreshing on a non-root route (e.g. `/transactions`) works (SPA catch-all)
- [ ] Logging out clears the session cookie
- [ ] Opening a PR creates preview deployments for both projects
