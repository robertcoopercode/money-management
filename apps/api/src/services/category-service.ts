import { prisma } from "@ledgr/db"
import { Effect } from "effect"
import type { UpdateCategoryInput, UpdateCategoryGroupInput } from "@ledgr/shared"

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

export const updateCategory = (id: string, input: UpdateCategoryInput) =>
  Effect.tryPromise({
    try: async () => {
      const data: Record<string, unknown> = {}
      if (input.name !== undefined) data.name = input.name.trim()
      if (input.groupId !== undefined) {
        data.groupId = input.groupId
        const maxSort =
          (
            await prisma.category.aggregate({
              where: { groupId: input.groupId },
              _max: { sortOrder: true },
            })
          )._max.sortOrder ?? 0
        data.sortOrder = maxSort + 1
      }
      return prisma.category.update({ where: { id }, data })
    },
    catch: (error) => new Error(`Unable to update category: ${String(error)}`),
  })

export const updateCategoryGroup = (id: string, input: UpdateCategoryGroupInput) =>
  Effect.tryPromise({
    try: () =>
      prisma.categoryGroup.update({
        where: { id },
        data: { name: input.name.trim() },
      }),
    catch: (error) => new Error(`Unable to update category group: ${String(error)}`),
  })

export const getCategoryDeleteImpact = (id: string) =>
  Effect.tryPromise({
    try: async () => {
      const [transactions, splits, assignments, payeeDefaults] = await Promise.all([
        prisma.transaction.count({ where: { categoryId: id } }),
        prisma.transactionSplit.count({ where: { categoryId: id } }),
        prisma.categoryAssignment.count({ where: { categoryId: id } }),
        prisma.payee.count({ where: { defaultCategoryId: id } }),
      ])
      return { transactions, splits, assignments, payeeDefaults }
    },
    catch: (error) => new Error(`Unable to get category impact: ${String(error)}`),
  })

export const deleteCategory = (id: string) =>
  Effect.tryPromise({
    try: () =>
      prisma.$transaction(async (tx) => {
        await tx.transaction.updateMany({
          where: { categoryId: id },
          data: { categoryId: null },
        })
        await tx.category.delete({ where: { id } })
      }),
    catch: (error) => new Error(`Unable to delete category: ${String(error)}`),
  })

export const getCategoryGroupDeleteImpact = (groupId: string) =>
  Effect.tryPromise({
    try: async () => {
      const categories = await prisma.category.findMany({
        where: { groupId },
        select: { id: true },
      })
      const categoryIds = categories.map((c) => c.id)
      if (categoryIds.length === 0) {
        return { categories: 0, transactions: 0, splits: 0, assignments: 0, payeeDefaults: 0 }
      }
      const [transactions, splits, assignments, payeeDefaults] = await Promise.all([
        prisma.transaction.count({ where: { categoryId: { in: categoryIds } } }),
        prisma.transactionSplit.count({ where: { categoryId: { in: categoryIds } } }),
        prisma.categoryAssignment.count({ where: { categoryId: { in: categoryIds } } }),
        prisma.payee.count({ where: { defaultCategoryId: { in: categoryIds } } }),
      ])
      return { categories: categoryIds.length, transactions, splits, assignments, payeeDefaults }
    },
    catch: (error) => new Error(`Unable to get group impact: ${String(error)}`),
  })

export const deleteCategoryGroup = (groupId: string) =>
  Effect.tryPromise({
    try: () =>
      prisma.$transaction(async (tx) => {
        const categories = await tx.category.findMany({
          where: { groupId },
          select: { id: true },
        })
        const categoryIds = categories.map((c) => c.id)
        if (categoryIds.length > 0) {
          await tx.transaction.updateMany({
            where: { categoryId: { in: categoryIds } },
            data: { categoryId: null },
          })
        }
        // Cascade delete handles categories, splits, assignments
        await tx.categoryGroup.delete({ where: { id: groupId } })
      }),
    catch: (error) => new Error(`Unable to delete category group: ${String(error)}`),
  })
