import type { Hono } from "hono"
import { createTagSchema, updateTagSchema } from "@ledgr/shared"

import { parseJson } from "../lib/http.js"
import { runApiEffect } from "../lib/effect-helpers.js"
import {
  createTag,
  deleteTag,
  listTags,
  updateTag,
} from "../services/tag-service.js"

export const registerTagRoutes = (app: Hono) => {
  app.get("/api/tags", async (context) => {
    const tags = await runApiEffect(listTags)
    return context.json(tags)
  })

  app.post("/api/tags", async (context) => {
    const payload = await parseJson(context, createTagSchema)
    const tag = await runApiEffect(createTag(payload))
    return context.json(tag, 201)
  })

  app.patch("/api/tags/:tagId", async (context) => {
    const tagId = context.req.param("tagId")
    const payload = await parseJson(context, updateTagSchema)
    const tag = await runApiEffect(updateTag(tagId, payload))
    return context.json(tag)
  })

  app.delete("/api/tags/:tagId", async (context) => {
    const tagId = context.req.param("tagId")
    await runApiEffect(deleteTag(tagId))
    return context.body(null, 204)
  })
}
