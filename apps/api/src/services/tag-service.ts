import { prisma } from "@ledgr/db"
import type { CreateTagInput, UpdateTagInput } from "@ledgr/shared"
import { Effect } from "effect"

const normalizeTagName = (name: string) => name.trim().toUpperCase()

export const listTags = Effect.tryPromise({
  try: () =>
    prisma.tag.findMany({
      orderBy: { name: "asc" },
    }),
  catch: (error) => new Error(`Unable to list tags: ${String(error)}`),
})

export const createTag = (input: CreateTagInput) =>
  Effect.tryPromise({
    try: async () => {
      const normalized = normalizeTagName(input.name)
      const existing = await prisma.tag.findUnique({
        where: { normalizedName: normalized },
      })
      if (existing) {
        throw new Error(`A tag with name "${normalized}" already exists.`)
      }
      return prisma.tag.create({
        data: {
          name: normalized,
          normalizedName: normalized,
          description: input.description,
          backgroundColor: input.backgroundColor,
          textColor: input.textColor,
        },
      })
    },
    catch: (error) => new Error(`Unable to create tag: ${String(error)}`),
  })

export const updateTag = (tagId: string, input: UpdateTagInput) =>
  Effect.tryPromise({
    try: async () => {
      const data: Record<string, unknown> = {}

      if (input.name !== undefined) {
        const normalized = normalizeTagName(input.name)
        const existing = await prisma.tag.findFirst({
          where: { normalizedName: normalized, id: { not: tagId } },
        })
        if (existing) {
          throw new Error(`A tag with name "${normalized}" already exists.`)
        }
        data.name = normalized
        data.normalizedName = normalized
      }
      if (input.description !== undefined) data.description = input.description
      if (input.backgroundColor !== undefined)
        data.backgroundColor = input.backgroundColor
      if (input.textColor !== undefined) data.textColor = input.textColor
      if (input.isArchived !== undefined) data.isArchived = input.isArchived

      return prisma.tag.update({ where: { id: tagId }, data })
    },
    catch: (error) => new Error(`Unable to update tag: ${String(error)}`),
  })

export const deleteTag = (tagId: string) =>
  Effect.tryPromise({
    try: () => prisma.tag.delete({ where: { id: tagId } }),
    catch: (error) => new Error(`Unable to delete tag: ${String(error)}`),
  })
