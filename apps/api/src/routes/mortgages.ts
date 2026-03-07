import type { Hono } from "hono"
import { mortgageProfileSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  getMortgageProfile,
  upsertMortgageProfile,
} from "../services/mortgage-service.js"

export const registerMortgageRoutes = (app: Hono) => {
  app.get("/api/mortgages/:accountId", async (context) => {
    const accountId = context.req.param("accountId")
    const profile = await runApiEffect(getMortgageProfile(accountId))

    if (!profile) {
      return context.body(null, 404)
    }

    return context.json(profile)
  })

  app.post("/api/mortgages", async (context) => {
    const payload = await parseJson(context, mortgageProfileSchema)
    const profile = await runApiEffect(upsertMortgageProfile(payload))
    return context.json(profile)
  })
}
