import type { Hono } from "hono"
import { createPayeeSchema, updatePayeeSchema, mergePayeesSchema, combinePayeesSchema, deletePayeesSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  combinePayees,
  createPayee,
  deletePayees,
  listPayeeTransactions,
  listPayees,
  mergePayees,
  updatePayee,
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

  app.patch("/api/payees/:payeeId", async (context) => {
    const payeeId = context.req.param("payeeId")
    const payload = await parseJson(context, updatePayeeSchema)
    const updated = await runApiEffect(updatePayee(payeeId, payload))
    return context.json(updated)
  })

  app.post("/api/payees/merge", async (context) => {
    const payload = await parseJson(context, mergePayeesSchema)
    const merged = await runApiEffect(
      mergePayees(payload.sourcePayeeId, payload.targetPayeeId),
    )
    return context.json(merged)
  })

  app.post("/api/payees/combine", async (context) => {
    const payload = await parseJson(context, combinePayeesSchema)
    const result = await runApiEffect(combinePayees(payload))
    return context.json(result, 201)
  })

  app.post("/api/payees/delete", async (context) => {
    const payload = await parseJson(context, deletePayeesSchema)
    const result = await runApiEffect(deletePayees(payload.payeeIds))
    return context.json(result)
  })

  app.get("/api/payees/:payeeId/transactions", async (context) => {
    const payeeId = context.req.param("payeeId")
    const transactions = await runApiEffect(listPayeeTransactions(payeeId))
    return context.json(transactions)
  })
}
