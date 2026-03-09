import { randomUUID } from "node:crypto"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { ZodError } from "zod"

import { apiLogger } from "./lib/logger.js"
import { authMiddleware } from "./middleware/auth.js"
import { csrfMiddleware } from "./middleware/csrf.js"
import { registerAccountRoutes } from "./routes/accounts.js"
import { registerAuthRoutes } from "./routes/auth.js"
import { registerCategoryRoutes } from "./routes/categories.js"
import { registerHealthRoutes } from "./routes/health.js"
import { registerImportRoutes } from "./routes/imports.js"
import { registerPayeeRoutes } from "./routes/payees.js"
import { registerPlanningRoutes } from "./routes/planning.js"
import { registerReportRoutes } from "./routes/reports.js"
import { registerTransactionRoutes } from "./routes/transactions.js"

export const app = new Hono()

const allowedOrigin = process.env.AUTH_ORIGIN ?? "http://localhost:5173"

app.use(
  "*",
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
)

app.use("*", csrfMiddleware)
app.use("/api/*", authMiddleware)
app.use("*", async (context, next) => {
  const requestId = context.req.header("x-request-id") ?? randomUUID()
  context.header("x-request-id", requestId)

  const startedAt = Date.now()
  try {
    await next()
  } finally {
    const durationMs = Date.now() - startedAt

    apiLogger.info({
      requestId,
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
      durationMs,
    })
  }
})

app.onError((error, context) => {
  const requestId =
    context.res.headers.get("x-request-id") ??
    context.req.header("x-request-id") ??
    "unknown"

  apiLogger.error({
    requestId,
    method: context.req.method,
    path: context.req.path,
    message: error.message,
  })

  if (error instanceof ZodError) {
    return context.json(
      {
        message: "Validation failed.",
        issues: error.issues,
        requestId,
      },
      400,
    )
  }

  return context.json(
    {
      message: "Unexpected server error.",
      error: error.message,
      requestId,
    },
    500,
  )
})

registerAuthRoutes(app)
registerHealthRoutes(app)
registerAccountRoutes(app)
registerPayeeRoutes(app)
registerCategoryRoutes(app)
registerTransactionRoutes(app)
registerImportRoutes(app)
registerPlanningRoutes(app)
registerReportRoutes(app)
