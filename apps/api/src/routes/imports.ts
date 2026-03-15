import type { Hono } from "hono"
import { csvImportRequestSchema } from "@ledgr/shared"
import { prisma } from "@ledgr/db"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import { importTransactionsFromCsv } from "../services/import-service.js"

export const registerImportRoutes = (app: Hono) => {
  app.post("/api/imports/csv", async (context) => {
    const payload = await parseJson(context, csvImportRequestSchema)
    const result = await runApiEffect(importTransactionsFromCsv(payload))
    return context.json(result, 201)
  })

  app.post("/api/transactions/:transactionId/approve", async (context) => {
    const { transactionId } = context.req.param()
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { pendingApproval: false },
    })
    return context.json(transaction)
  })

  app.post("/api/transactions/:transactionId/reject", async (context) => {
    const { transactionId } = context.req.param()
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, importedTransactionId: true },
    })

    if (!transaction) {
      return context.json({ error: "Transaction not found" }, 404)
    }

    // Clear link to ImportedTransaction first (if any), then delete the Transaction
    // ImportedTransaction is preserved for dedup purposes
    if (transaction.importedTransactionId) {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { importedTransactionId: null },
      })
    }

    await prisma.transaction.delete({
      where: { id: transactionId },
    })

    return context.json({ success: true })
  })

  app.post("/api/transactions/:transactionId/unmatch", async (context) => {
    const { transactionId } = context.req.param()
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        accountId: true,
        importedTransactionId: true,
        importedTransaction: true,
      },
    })

    if (!transaction) {
      return context.json({ error: "Transaction not found" }, 404)
    }

    if (!transaction.importedTransactionId || !transaction.importedTransaction) {
      return context.json(
        { error: "Transaction is not linked to an import" },
        400,
      )
    }

    const importedTx = transaction.importedTransaction

    // In a single transaction:
    // 1. Unlink original transaction and clear its pending state
    // 2. Create new transaction from the imported data
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          importedTransactionId: null,
          pendingApproval: false,
        },
      })

      // Find payee for the new transaction
      let payeeId: string | undefined
      let categoryId: string | undefined
      if (importedTx.payeeName) {
        const existingPayee = await tx.payee.findFirst({
          where: { normalizedName: importedTx.payeeName },
        })
        if (existingPayee) {
          payeeId = existingPayee.id
          if (existingPayee.defaultCategoryId) {
            categoryId = existingPayee.defaultCategoryId
          }
        }
      }

      await tx.transaction.create({
        data: {
          accountId: transaction.accountId,
          date: importedTx.date,
          amountMinor: importedTx.amountMinor,
          payeeId,
          categoryId,
          note: importedTx.note,
          cleared: true,
          manualCreated: false,
          pendingApproval: false,
          importedTransactionId: importedTx.id,
        },
      })
    })

    return context.json({ success: true })
  })
}
