import { prisma } from "@money/db"
import { Effect } from "effect"

export const listCategoryGroups = Effect.tryPromise({
  try: () =>
    prisma.categoryGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        categories: {
          where: { isArchived: false },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  catch: (error) => new Error(`Unable to list categories: ${String(error)}`),
})
