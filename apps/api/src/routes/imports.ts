import type { Hono } from "hono"
import { csvImportRequestSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import { importTransactionsFromCsv } from "../services/import-service.js"

export const registerImportRoutes = (app: Hono) => {
  app.post("/api/imports/csv", async (context) => {
    const payload = await parseJson(context, csvImportRequestSchema)
    const result = await runApiEffect(importTransactionsFromCsv(payload))
    return context.json(result, 201)
  })
}
