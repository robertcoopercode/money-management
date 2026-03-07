import type { Hono } from "hono"
import { updateCategoryAssignmentSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  getPlanningMonth,
  setCategoryAssignment,
} from "../services/planning-service.js"

export const registerPlanningRoutes = (app: Hono) => {
  app.get("/api/planning/:month", async (context) => {
    const month = context.req.param("month")
    const planning = await runApiEffect(getPlanningMonth(month))
    return context.json(planning)
  })

  app.post("/api/planning/assignments", async (context) => {
    const payload = await parseJson(context, updateCategoryAssignmentSchema)
    const assignment = await runApiEffect(setCategoryAssignment(payload))
    return context.json(assignment)
  })
}
