import type { Hono } from "hono"
import { reportFilterSchema } from "@ledgr/shared"

import { parseQuery } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import { getReports, getCategoryReport } from "../services/reporting-service.js"

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
        clearingStatus: query.clearingStatus,
      }),
    )

    return context.json(reports)
  })

  app.get("/api/reports/categories", async (context) => {
    const query = parseQuery(context, reportFilterSchema)
    const report = await runApiEffect(
      getCategoryReport({
        fromDate: query.fromDate,
        toDate: query.toDate,
        accountIds: query.accountIds?.split(",").filter(Boolean),
        categoryIds: query.categoryIds?.split(",").filter(Boolean),
        payeeIds: query.payeeIds?.split(",").filter(Boolean),
        clearingStatus: query.clearingStatus,
      }),
    )

    return context.json(report)
  })
}
