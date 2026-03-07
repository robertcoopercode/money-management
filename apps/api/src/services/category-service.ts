import { prisma } from "@ledgr/db"
import { Effect } from "effect"

const DEFAULT_CATEGORY_GROUP_NAME = "Uncategorized"

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

export const createCategory = (name: string, groupName?: string) =>
  Effect.tryPromise({
    try: async () => {
      const trimmedName = name.trim()
      const trimmedGroupName = (groupName ?? DEFAULT_CATEGORY_GROUP_NAME).trim()

      const group =
        (await prisma.categoryGroup.findUnique({
          where: { name: trimmedGroupName },
        })) ??
        (await prisma.categoryGroup.create({
          data: {
            name: trimmedGroupName,
            sortOrder:
              ((
                await prisma.categoryGroup.aggregate({
                  _max: { sortOrder: true },
                })
              )._max.sortOrder ?? 0) + 1,
          },
        }))

      const maxSortOrderInGroup =
        (
          await prisma.category.aggregate({
            where: { groupId: group.id },
            _max: { sortOrder: true },
          })
        )._max.sortOrder ?? 0

      return prisma.category.create({
        data: {
          name: trimmedName,
          groupId: group.id,
          sortOrder: maxSortOrderInGroup + 1,
        },
      })
    },
    catch: (error) => new Error(`Unable to create category: ${String(error)}`),
  })
