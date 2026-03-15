import type { Hono } from "hono"
import {
  bulkTransactionIdsSchema,
  createTransactionSchema,
  transactionFilterSchema,
  transactionIdSchema,
  updateTransactionSchema,
} from "@ledgr/shared"

import { parseJson, parseQuery } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  bulkApproveTransactions,
  bulkDeleteTransactions,
  bulkRejectTransactions,
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "../services/transaction-service.js"

export const registerTransactionRoutes = (app: Hono) => {
  app.post("/api/transactions/bulk-approve", async (context) => {
    const { transactionIds } = await parseJson(context, bulkTransactionIdsSchema)
    const result = await runApiEffect(bulkApproveTransactions(transactionIds))
    return context.json({ count: result.count })
  })

  app.post("/api/transactions/bulk-reject", async (context) => {
    const { transactionIds } = await parseJson(context, bulkTransactionIdsSchema)
    const result = await runApiEffect(bulkRejectTransactions(transactionIds))
    return context.json({ count: result.count })
  })

  app.post("/api/transactions/bulk-delete", async (context) => {
    const { transactionIds } = await parseJson(context, bulkTransactionIdsSchema)
    const result = await runApiEffect(bulkDeleteTransactions(transactionIds))
    return context.json({ count: result.count })
  })

  app.get("/api/transactions", async (context) => {
    const filters = parseQuery(context, transactionFilterSchema)
    const transactions = await runApiEffect(listTransactions(filters))
    return context.json(transactions)
  })

  app.post("/api/transactions", async (context) => {
    const payload = await parseJson(context, createTransactionSchema)
    const transaction = await runApiEffect(
      createTransaction({
        accountId: payload.accountId,
        transferAccountId: payload.transferAccountId,
        date: payload.date,
        amountMinor: payload.amountMinor,
        payeeId: payload.payeeId,
        categoryId: payload.categoryId,
        note: payload.note,
        clearingStatus: payload.clearingStatus,
        splits: payload.splits,
        tagIds: payload.tagIds,
      }),
    )

    return context.json(transaction, 201)
  })

  app.patch("/api/transactions/:transactionId", async (context) => {
    const transactionId = transactionIdSchema.parse(
      context.req.param("transactionId"),
    )
    const payload = await parseJson(context, updateTransactionSchema)
    const transaction = await runApiEffect(
      updateTransaction(transactionId, {
        accountId: payload.accountId,
        transferAccountId: payload.transferAccountId,
        date: payload.date,
        amountMinor: payload.amountMinor,
        payeeId: payload.payeeId,
        categoryId: payload.categoryId,
        note: payload.note,
        clearingStatus: payload.clearingStatus,
        splits: payload.splits,
        tagIds: payload.tagIds,
      }),
    )

    return context.json(transaction)
  })

  app.delete("/api/transactions/:transactionId", async (context) => {
    const transactionId = transactionIdSchema.parse(
      context.req.param("transactionId"),
    )
    await runApiEffect(deleteTransaction(transactionId))
    return context.body(null, 204)
  })
}
