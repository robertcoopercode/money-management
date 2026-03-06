import type { Hono } from "hono"
import { reportFilterSchema } from "@money/shared"

import { parseQuery } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import { getReports } from "../services/reporting-service.js"

export const registerReportRoutes = (app: Hono) => {
  app.get("/api/reports", async (context) => {
    const query = parseQuery(context, reportFilterSchema)
    const reports = await runApiEffect(
      getReports({
        fromDate: query.fromDate,
        toDate: query.toDate,
        accountIds: query.accountIds?.split(",").filter(Boolean),
        categoryIds: query.categoryIds?.split(",").filter(Boolean),
        payeeIds: query.payeeIds?.split(",").filter(Boolean),
        cleared: query.cleared,
      }),
    )

    return context.json(reports)
  })
}
