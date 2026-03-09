import type { Hono } from "hono"
import { getCookie, setCookie, deleteCookie } from "hono/cookie"
import { verify } from "@node-rs/argon2"
import { loginSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import {
  generateSessionToken,
  createSession,
  validateSession,
  deleteSession,
  deleteExpiredSessions,
} from "../lib/session.js"

const SESSION_COOKIE = "session"
const MAX_ATTEMPTS = 10
const BLOCK_DURATION_MS = 10 * 60 * 1000 // 10 minutes

const loginAttempts = new Map<
  string,
  { count: number; blockedUntil: number }
>()

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  const entry = loginAttempts.get(ip)
  if (!entry) return false
  if (entry.blockedUntil > Date.now()) return true
  if (entry.blockedUntil > 0 && entry.blockedUntil <= Date.now()) {
    loginAttempts.delete(ip)
    return false
  }
  return false
}

function recordFailedAttempt(ip: string) {
  const entry = loginAttempts.get(ip) ?? { count: 0, blockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS
  }
  loginAttempts.set(ip, entry)
}

function isSecure(): boolean {
  return process.env.NODE_ENV === "production"
}

export const registerAuthRoutes = (app: Hono) => {
  app.post("/api/auth/login", async (c) => {
    const ip = getClientIp(c)

    if (isRateLimited(ip)) {
      return c.json({ message: "Too many attempts. Try again later." }, 429)
    }

    const { password } = await parseJson(c, loginSchema)

    const passwordHash = process.env.AUTH_PASSWORD_HASH
    if (!passwordHash) {
      return c.json({ message: "Authentication not configured." }, 500)
    }

    const valid = await verify(passwordHash, password)
    if (!valid) {
      recordFailedAttempt(ip)
      return c.json({ message: "Incorrect password." }, 401)
    }

    loginAttempts.delete(ip)

    void deleteExpiredSessions()

    const token = generateSessionToken()
    await createSession(token)

    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecure(),
      sameSite: "Lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    })

    return c.json({ ok: true })
  })

  app.post("/api/auth/logout", async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) {
      await deleteSession(token)
    }

    deleteCookie(c, SESSION_COOKIE, { path: "/" })
    return c.json({ ok: true })
  })

  app.get("/api/auth/me", async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (!token) {
      return c.json({ authenticated: false }, 401)
    }

    const session = await validateSession(token)
    if (!session) {
      deleteCookie(c, SESSION_COOKIE, { path: "/" })
      return c.json({ authenticated: false }, 401)
    }

    return c.json({ authenticated: true })
  })
}
