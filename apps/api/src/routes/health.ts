import type { Hono } from "hono"

export const registerHealthRoutes = (app: Hono) => {
  app.get("/health", (context) => {
    return context.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    })
  })
}
