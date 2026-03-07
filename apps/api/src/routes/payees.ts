import type { Hono } from "hono"
import { createPayeeSchema, mergePayeesSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  createPayee,
  listPayeeTransactions,
  listPayees,
  mergePayees,
} from "../services/payee-service.js"

export const registerPayeeRoutes = (app: Hono) => {
  app.get("/api/payees", async (context) => {
    const payees = await runApiEffect(listPayees)
    return context.json(payees)
  })

  app.post("/api/payees", async (context) => {
    const payload = await parseJson(context, createPayeeSchema)
    const payee = await runApiEffect(createPayee(payload.name))

    return context.json(payee, 201)
  })

  app.post("/api/payees/merge", async (context) => {
    const payload = await parseJson(context, mergePayeesSchema)
    const merged = await runApiEffect(
      mergePayees(payload.sourcePayeeId, payload.targetPayeeId),
    )
    return context.json(merged)
  })

  app.get("/api/payees/:payeeId/transactions", async (context) => {
    const payeeId = context.req.param("payeeId")
    const transactions = await runApiEffect(listPayeeTransactions(payeeId))
    return context.json(transactions)
  })
}
