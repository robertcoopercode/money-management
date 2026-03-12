import type { Context, Next } from "hono"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export const csrfMiddleware = async (c: Context, next: Next) => {
  if (SAFE_METHODS.has(c.req.method)) {
    return next()
  }

  const allowedOrigin = process.env.AUTH_ORIGIN ?? "http://localhost:5173"
  const origin = c.req.header("origin")

  if (!origin || origin !== allowedOrigin) {
    return c.json({ message: "Forbidden." }, 403)
  }

  return next()
}
