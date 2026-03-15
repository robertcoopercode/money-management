import type { Hono } from "hono"
import { createAccountSchema, updateAccountSchema, reconcileAccountSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  archiveAccount,
  createAccount,
  listAccounts,
  updateAccount,
} from "../services/account-service.js"
import { reconcileAccount } from "../services/reconciliation-service.js"

export const registerAccountRoutes = (app: Hono) => {
  app.get("/api/accounts", async (context) => {
    const accounts = await runApiEffect(listAccounts)
    return context.json(accounts)
  })

  app.post("/api/accounts", async (context) => {
    const payload = await parseJson(context, createAccountSchema)

    const account = await runApiEffect(
      createAccount({
        name: payload.name,
        type: payload.type,
        startingBalanceMinor: payload.startingBalanceMinor,
        openedAt: payload.openedAt ? new Date(payload.openedAt) : undefined,
        ...(payload.type === "LOAN" && payload.loanType
          ? {
              loanProfile: {
                create: {
                  loanType: payload.loanType,
                  interestRateAnnual: payload.interestRateAnnual ?? 0,
                  minimumPaymentMinor: payload.minimumPaymentMinor ?? 0,
                },
              },
            }
          : {}),
      }),
    )

    return context.json(account, 201)
  })

  app.patch("/api/accounts/:accountId", async (context) => {
    const accountId = context.req.param("accountId")
    const payload = await parseJson(context, updateAccountSchema)

    const account = await runApiEffect(
      updateAccount(accountId, {
        name: payload.name,
        type: payload.type,
        startingBalanceMinor: payload.startingBalanceMinor,
        openedAt: payload.openedAt ? new Date(payload.openedAt) : undefined,
      }),
    )

    return context.json(account)
  })

  app.post("/api/accounts/:accountId/reconcile", async (context) => {
    const accountId = context.req.param("accountId")
    const payload = await parseJson(context, reconcileAccountSchema)
    const result = await runApiEffect(
      reconcileAccount(accountId, payload.statementBalanceMinor),
    )
    return context.json(result)
  })

  app.delete("/api/accounts/:accountId", async (context) => {
    const accountId = context.req.param("accountId")
    await runApiEffect(archiveAccount(accountId))
    return context.body(null, 204)
  })
}
