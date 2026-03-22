import { prisma } from "@ledgr/db"
import { Effect } from "effect"
import {
  calculateCategoryAvailableMinor,
  calculateReadyToAssignMinor,
} from "../domain/planning.js"

const monthStart = (month: string) => new Date(`${month}-01T00:00:00.000Z`)

const nextMonth = (month: string) => {
  const [yearPart, monthPart] = month.split("-")
  const year = Number(yearPart)
  const monthNumber = Number(monthPart)

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) {
    throw new Error(`Invalid month format: ${month}`)
  }

  const date = new Date(Date.UTC(year, monthNumber - 1, 1))
  date.setUTCMonth(date.getUTCMonth() + 1)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

const monthEndExclusive = (month: string) => monthStart(nextMonth(month))

const UNCATEGORIZED_GROUP_ID = "__uncategorized__"

export const getPlanningMonth = (month: string) =>
  Effect.tryPromise({
    try: async () => {
      const [categoryGroups, ungroupedCategories] = await Promise.all([
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

      const start = monthStart(month)
      const endExclusive = monthEndExclusive(month)

      const [
        thisMonthAssignments,
        thisMonthActivity,
        thisMonthSplitActivity,
        carryoverActivity,
        carryoverSplitActivity,
        carryoverAssignments,
      ] = await Promise.all([
        prisma.categoryAssignment.findMany({
          where: { month },
        }),
        prisma.transaction.groupBy({
          by: ["categoryId"],
          where: {
            categoryId: { not: null },
            date: {
              gte: start,
              lt: endExclusive,
            },
          },
          _sum: { amountMinor: true },
        }),
        prisma.transactionSplit.groupBy({
          by: ["categoryId"],
          where: {
            transaction: {
              date: { gte: start, lt: endExclusive },
            },
          },
          _sum: { amountMinor: true },
        }),
        prisma.transaction.groupBy({
          by: ["categoryId"],
          where: {
            categoryId: { not: null },
            date: { lt: start },
          },
          _sum: { amountMinor: true },
        }),
        prisma.transactionSplit.groupBy({
          by: ["categoryId"],
          where: {
            transaction: {
              date: { lt: start },
            },
          },
          _sum: { amountMinor: true },
        }),
        prisma.categoryAssignment.findMany({
          where: {
            month: { lt: month },
          },
        }),
      ])

      const assignmentMap = new Map(
        thisMonthAssignments.map((item) => [
          item.categoryId,
          item.assignedMinor,
        ]),
      )
      const activityMap = new Map(
        thisMonthActivity.map((item) => [
          item.categoryId ?? "",
          item._sum.amountMinor ?? 0,
        ]),
      )
      for (const item of thisMonthSplitActivity) {
        activityMap.set(
          item.categoryId,
          (activityMap.get(item.categoryId) ?? 0) +
            (item._sum.amountMinor ?? 0),
        )
      }

      const priorActivityMap = new Map(
        carryoverActivity.map((item) => [
          item.categoryId ?? "",
          item._sum.amountMinor ?? 0,
        ]),
      )
      for (const item of carryoverSplitActivity) {
        priorActivityMap.set(
          item.categoryId,
          (priorActivityMap.get(item.categoryId) ?? 0) +
            (item._sum.amountMinor ?? 0),
        )
      }
      const priorAssignmentMap = new Map<string, number>()

      for (const assignment of carryoverAssignments) {
        priorAssignmentMap.set(
          assignment.categoryId,
          (priorAssignmentMap.get(assignment.categoryId) ?? 0) +
            assignment.assignedMinor,
        )
      }

      const buildCategoryItem = (category: { id: string; name: string; sortOrder: string; isIncomeCategory: boolean }) => {
        const assignedMinor = assignmentMap.get(category.id) ?? 0
        const activityMinor = activityMap.get(category.id) ?? 0
        const availableMinor = calculateCategoryAvailableMinor({
          priorAssignedMinor: priorAssignmentMap.get(category.id) ?? 0,
          priorActivityMinor: priorActivityMap.get(category.id) ?? 0,
          assignedMinor,
          activityMinor,
        })
        return {
          categoryId: category.id,
          categoryName: category.name,
          sortOrder: category.sortOrder,
          assignedMinor,
          activityMinor,
          availableMinor,
          isIncomeCategory: category.isIncomeCategory,
        }
      }

      const groups = categoryGroups.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        groupSortOrder: group.sortOrder,
        categories: group.categories.map(buildCategoryItem),
      }))

      if (ungroupedCategories.length > 0) {
        groups.push({
          groupId: UNCATEGORIZED_GROUP_ID,
          groupName: "Uncategorized",
          groupSortOrder: "~",
          categories: ungroupedCategories.map(buildCategoryItem),
        })
      }

      const [
        incomeThroughMonth,
        incomeSplitsThroughMonth,
        totalAssignedThroughMonth,
      ] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amountMinor: true },
          where: {
            category: {
              isIncomeCategory: true,
            },
            date: { lt: endExclusive },
          },
        }),
        prisma.transactionSplit.aggregate({
          _sum: { amountMinor: true },
          where: {
            category: { isIncomeCategory: true },
            transaction: { date: { lt: endExclusive } },
          },
        }),
        prisma.categoryAssignment.aggregate({
          _sum: { assignedMinor: true },
          where: {
            month: { lte: month },
          },
        }),
      ])

      const readyToAssignMinor = calculateReadyToAssignMinor({
        incomeThroughMonthMinor:
          (incomeThroughMonth._sum.amountMinor ?? 0) +
          (incomeSplitsThroughMonth._sum.amountMinor ?? 0),
        assignedThroughMonthMinor:
          totalAssignedThroughMonth._sum.assignedMinor ?? 0,
      })

      return {
        month,
        readyToAssignMinor,
        groups,
      }
    },
    catch: (error) =>
      new Error(`Unable to load planning month: ${String(error)}`),
  })

export const setCategoryAssignment = (input: {
  month: string
  categoryId: string
  assignedMinor: number
}) =>
  Effect.tryPromise({
    try: async () => {
      return prisma.categoryAssignment.upsert({
        where: {
          month_categoryId: {
            month: input.month,
            categoryId: input.categoryId,
          },
        },
        update: { assignedMinor: input.assignedMinor },
        create: {
          month: input.month,
          categoryId: input.categoryId,
          assignedMinor: input.assignedMinor,
        },
      })
    },
    catch: (error) =>
      new Error(`Unable to set category assignment: ${String(error)}`),
  })

export const setBulkCategoryAssignments = (
  inputs: { month: string; categoryId: string; assignedMinor: number }[],
) =>
  Effect.tryPromise({
    try: async () => {
      return prisma.$transaction(
        inputs.map((input) =>
          prisma.categoryAssignment.upsert({
            where: {
              month_categoryId: {
                month: input.month,
                categoryId: input.categoryId,
              },
            },
            update: { assignedMinor: input.assignedMinor },
            create: {
              month: input.month,
              categoryId: input.categoryId,
              assignedMinor: input.assignedMinor,
            },
          }),
        ),
      )
    },
    catch: (error) =>
      new Error(`Unable to set bulk category assignments: ${String(error)}`),
  })

const READY_TO_ASSIGN = "ready-to-assign"

export const moveBudget = (input: {
  month: string
  fromCategoryId: string
  toCategoryId: string
  amountMinor: number
}) =>
  Effect.tryPromise({
    try: async () => {
      // Look up current assignments for both sides (if they are real categories)
      const categoryIds = [input.fromCategoryId, input.toCategoryId].filter(
        (id) => id !== READY_TO_ASSIGN,
      )

      const existingAssignments = await prisma.categoryAssignment.findMany({
        where: {
          month: input.month,
          categoryId: { in: categoryIds },
        },
      })

      const assignedMap = new Map(
        existingAssignments.map((a) => [a.categoryId, a.assignedMinor]),
      )

      const updates: { categoryId: string; assignedMinor: number }[] = []

      if (input.fromCategoryId !== READY_TO_ASSIGN) {
        const current = assignedMap.get(input.fromCategoryId) ?? 0
        updates.push({
          categoryId: input.fromCategoryId,
          assignedMinor: current - input.amountMinor,
        })
      }

      if (input.toCategoryId !== READY_TO_ASSIGN) {
        const current = assignedMap.get(input.toCategoryId) ?? 0
        updates.push({
          categoryId: input.toCategoryId,
          assignedMinor: current + input.amountMinor,
        })
      }

      if (updates.length > 0) {
        await prisma.$transaction(
          updates.map((u) =>
            prisma.categoryAssignment.upsert({
              where: {
                month_categoryId: {
                  month: input.month,
                  categoryId: u.categoryId,
                },
              },
              update: { assignedMinor: u.assignedMinor },
              create: {
                month: input.month,
                categoryId: u.categoryId,
                assignedMinor: u.assignedMinor,
              },
            }),
          ),
        )
      }

      return { success: true }
    },
    catch: (error) =>
      new Error(`Unable to move budget: ${String(error)}`),
  })
