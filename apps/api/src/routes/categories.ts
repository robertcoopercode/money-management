import type { Hono } from "hono"

import { runApiEffect } from "../lib/effect-helpers.js"
import { listCategoryGroups } from "../services/category-service.js"

export const registerCategoryRoutes = (app: Hono) => {
  app.get("/api/categories", async (context) => {
    const groups = await runApiEffect(listCategoryGroups)
    return context.json(groups)
  })
}
