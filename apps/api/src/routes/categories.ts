import type { Hono } from "hono"
import { createCategorySchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  createCategory,
  listCategoryGroups,
} from "../services/category-service.js"

export const registerCategoryRoutes = (app: Hono) => {
  app.get("/api/categories", async (context) => {
    const groups = await runApiEffect(listCategoryGroups)
    return context.json(groups)
  })

  app.post("/api/categories", async (context) => {
    const payload = await parseJson(context, createCategorySchema)
    const category = await runApiEffect(
      createCategory(payload.name, payload.groupName),
    )
    return context.json(category, 201)
  })
}
