import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"

import { validateSession } from "../lib/session.js"

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/health",
])

export const authMiddleware = async (c: Context, next: Next) => {
  if (PUBLIC_PATHS.has(c.req.path)) {
    return next()
  }

  const token = getCookie(c, "session")
  if (!token) {
    return c.json({ message: "Unauthorized." }, 401)
  }

  const session = await validateSession(token)
  if (!session) {
    return c.json({ message: "Unauthorized." }, 401)
  }

  return next()
}
