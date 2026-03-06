import { Hono } from "hono"
import { cors } from "hono/cors"
import { ZodError } from "zod"

import { apiLogger } from "./lib/logger.js"
import { registerAccountRoutes } from "./routes/accounts.js"
import { registerCategoryRoutes } from "./routes/categories.js"
import { registerHealthRoutes } from "./routes/health.js"
import { registerImportRoutes } from "./routes/imports.js"
import { registerMortgageRoutes } from "./routes/mortgages.js"
import { registerPayeeRoutes } from "./routes/payees.js"
import { registerPlanningRoutes } from "./routes/planning.js"
import { registerReportRoutes } from "./routes/reports.js"
import { registerTransactionRoutes } from "./routes/transactions.js"

export const app = new Hono()

app.use("*", cors())
app.use("*", async (context, next) => {
  const startedAt = Date.now()
  await next()
  const durationMs = Date.now() - startedAt

  apiLogger.info({
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
    durationMs,
  })
})

app.onError((error, context) => {
  if (error instanceof ZodError) {
    return context.json(
      {
        message: "Validation failed.",
        issues: error.issues,
      },
      400,
    )
  }

  return context.json(
    {
      message: "Unexpected server error.",
      error: error.message,
    },
    500,
  )
})

registerHealthRoutes(app)
registerAccountRoutes(app)
registerPayeeRoutes(app)
registerCategoryRoutes(app)
registerTransactionRoutes(app)
registerImportRoutes(app)
registerPlanningRoutes(app)
registerReportRoutes(app)
registerMortgageRoutes(app)
