import type { Hono } from "hono"
import {
  createCategorySchema,
  updateCategorySchema,
  updateCategoryGroupSchema,
  createCategoryGroupSchema,
  reorderCategorySchema,
  reorderCategoryGroupSchema,
} from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  createCategory,
  createCategoryGroup,
  listCategoryGroups,
  updateCategory,
  updateCategoryGroup,
  reorderCategory,
  reorderCategoryGroup,
  getCategoryDeleteImpact,
  deleteCategory,
  getCategoryGroupDeleteImpact,
  deleteCategoryGroup,
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

  app.patch("/api/categories/:categoryId", async (context) => {
    const { categoryId } = context.req.param()
    const payload = await parseJson(context, updateCategorySchema)
    const category = await runApiEffect(updateCategory(categoryId, payload))
    return context.json(category)
  })

  app.patch("/api/categories/:categoryId/reorder", async (context) => {
    const { categoryId } = context.req.param()
    const payload = await parseJson(context, reorderCategorySchema)
    const category = await runApiEffect(reorderCategory(categoryId, payload))
    return context.json(category)
  })

  app.get("/api/categories/:categoryId/impact", async (context) => {
    const { categoryId } = context.req.param()
    const impact = await runApiEffect(getCategoryDeleteImpact(categoryId))
    return context.json(impact)
  })

  app.delete("/api/categories/:categoryId", async (context) => {
    const { categoryId } = context.req.param()
    await runApiEffect(deleteCategory(categoryId))
    return context.json({ ok: true })
  })

  app.post("/api/category-groups", async (context) => {
    const payload = await parseJson(context, createCategoryGroupSchema)
    const group = await runApiEffect(createCategoryGroup(payload.name))
    return context.json(group, 201)
  })

  app.patch("/api/category-groups/:groupId", async (context) => {
    const { groupId } = context.req.param()
    const payload = await parseJson(context, updateCategoryGroupSchema)
    const group = await runApiEffect(updateCategoryGroup(groupId, payload))
    return context.json(group)
  })

  app.patch("/api/category-groups/:groupId/reorder", async (context) => {
    const { groupId } = context.req.param()
    const payload = await parseJson(context, reorderCategoryGroupSchema)
    const group = await runApiEffect(reorderCategoryGroup(groupId, payload))
    return context.json(group)
  })

  app.get("/api/category-groups/:groupId/impact", async (context) => {
    const { groupId } = context.req.param()
    const impact = await runApiEffect(getCategoryGroupDeleteImpact(groupId))
    return context.json(impact)
  })

  app.delete("/api/category-groups/:groupId", async (context) => {
    const { groupId } = context.req.param()
    await runApiEffect(deleteCategoryGroup(groupId))
    return context.json({ ok: true })
  })
}
