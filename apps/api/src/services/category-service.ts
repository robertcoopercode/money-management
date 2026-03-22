import { prisma } from "@ledgr/db"
import { Effect } from "effect"
import { generateKeyBetween } from "@ledgr/shared"
import type {
  UpdateCategoryInput,
  UpdateCategoryGroupInput,
  ReorderCategoryInput,
  ReorderCategoryGroupInput,
} from "@ledgr/shared"

export const UNCATEGORIZED_GROUP_ID = "__uncategorized__"

export const listCategoryGroups = Effect.tryPromise({
  try: async () => {
    const [groups, ungrouped] = await Promise.all([
      prisma.categoryGroup.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          categories: {
            where: { isArchived: false },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.category.findMany({
        where: { groupId: null, isArchived: false },
        orderBy: { sortOrder: "asc" },
      }),
    ])

    if (ungrouped.length > 0) {
      groups.push({
        id: UNCATEGORIZED_GROUP_ID,
        name: "Uncategorized",
        sortOrder: "~",
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: ungrouped,
      } as typeof groups[number])
    }

    return groups
  },
  catch: (error) => new Error(`Unable to list categories: ${String(error)}`),
})

export const createCategory = (name: string, groupName?: string) =>
  Effect.tryPromise({
    try: async () => {
      const trimmedName = name.trim()
      const trimmedGroupName = groupName?.trim()

      let groupId: string | null = null

      if (trimmedGroupName) {
        const group =
          (await prisma.categoryGroup.findUnique({
            where: { name: trimmedGroupName },
          })) ??
          (await (async () => {
            const lastGroup = await prisma.categoryGroup.findFirst({
              orderBy: { sortOrder: "desc" },
            })
            return prisma.categoryGroup.create({
              data: {
                name: trimmedGroupName,
                sortOrder: generateKeyBetween(lastGroup?.sortOrder ?? null, null),
              },
            })
          })())
        groupId = group.id
      }

      const lastCategory = await prisma.category.findFirst({
        where: { groupId },
        orderBy: { sortOrder: "desc" },
      })

      return prisma.category.create({
        data: {
          name: trimmedName,
          groupId,
          sortOrder: generateKeyBetween(lastCategory?.sortOrder ?? null, null),
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
      if (input.isIncomeCategory !== undefined) data.isIncomeCategory = input.isIncomeCategory
      if (input.groupId !== undefined) {
        data.groupId = input.groupId
        const lastCategory = await prisma.category.findFirst({
          where: { groupId: input.groupId },
          orderBy: { sortOrder: "desc" },
        })
        data.sortOrder = generateKeyBetween(lastCategory?.sortOrder ?? null, null)
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

export const createCategoryGroup = (name: string) =>
  Effect.tryPromise({
    try: async () => {
      const trimmed = name.trim()
      const lastGroup = await prisma.categoryGroup.findFirst({
        orderBy: { sortOrder: "desc" },
      })
      return prisma.categoryGroup.create({
        data: {
          name: trimmed,
          sortOrder: generateKeyBetween(lastGroup?.sortOrder ?? null, null),
        },
      })
    },
    catch: (error) => new Error(`Unable to create category group: ${String(error)}`),
  })

export const reorderCategory = (id: string, input: ReorderCategoryInput) =>
  Effect.tryPromise({
    try: () => {
      const data: Record<string, unknown> = { sortOrder: input.sortOrder }
      if (input.groupId !== undefined) data.groupId = input.groupId
      return prisma.category.update({ where: { id }, data })
    },
    catch: (error) => new Error(`Unable to reorder category: ${String(error)}`),
  })

export const reorderCategoryGroup = (id: string, input: ReorderCategoryGroupInput) =>
  Effect.tryPromise({
    try: () =>
      prisma.categoryGroup.update({
        where: { id },
        data: { sortOrder: input.sortOrder },
      }),
    catch: (error) => new Error(`Unable to reorder category group: ${String(error)}`),
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
      const categoryCount = await prisma.category.count({ where: { groupId } })
      return { categories: categoryCount }
    },
    catch: (error) => new Error(`Unable to get group impact: ${String(error)}`),
  })

export const deleteCategoryGroup = (groupId: string) =>
  Effect.tryPromise({
    try: () =>
      // onDelete: SetNull moves categories to ungrouped (Uncategorized)
      prisma.categoryGroup.delete({ where: { id: groupId } }),
    catch: (error) => new Error(`Unable to delete category group: ${String(error)}`),
  })
