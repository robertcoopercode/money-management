import "dotenv/config"
import { serve } from "@hono/node-server"

import { app } from "./app.js"
import { apiLogger } from "./lib/logger.js"

const port = Number(process.env.API_PORT ?? 3001)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    apiLogger.info(`API listening on http://localhost:${info.port}`)
  },
)
