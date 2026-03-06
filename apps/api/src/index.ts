import dotenv from "dotenv"
import { resolve } from "node:path"

dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") })
import { serve } from "@hono/node-server"

import { app } from "./app.js"
import { apiLogger } from "./lib/logger.js"

const port = Number(process.env.API_PORT ?? 3001)

if (!process.env.DATABASE_URL) {
  apiLogger.warn(
    "DATABASE_URL is not set. API will run, but DB-backed requests will fail.",
  )
}

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    apiLogger.info(`API listening on http://localhost:${info.port}`)
  },
)
