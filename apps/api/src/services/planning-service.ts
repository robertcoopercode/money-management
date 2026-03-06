import { prisma } from "@money/db"
import { Effect } from "effect"

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

type PlanningCategory = {
  categoryId: string
  groupName: string
  categoryName: string
  assignedMinor: number
  activityMinor: number
  availableMinor: number
}

export const getPlanningMonth = (month: string) =>
  Effect.tryPromise({
    try: async () => {
      const [budgetMonth, categoryGroups] = await Promise.all([
        prisma.budgetMonth.upsert({
          where: { month },
          update: {},
          create: { month },
        }),
        prisma.categoryGroup.findMany({
          orderBy: { sortOrder: "asc" },
          include: {
            categories: {
              where: { isArchived: false, isIncomeCategory: false },
              orderBy: { sortOrder: "asc" },
            },
          },
        }),
      ])

      const start = monthStart(month)
      const endExclusive = monthEndExclusive(month)

      const [
        thisMonthAssignments,
        thisMonthActivity,
        carryoverActivity,
        carryoverAssignments,
      ] = await Promise.all([
        prisma.categoryAssignment.findMany({
          where: { budgetMonthId: budgetMonth.id },
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
        prisma.transaction.groupBy({
          by: ["categoryId"],
          where: {
            categoryId: { not: null },
            date: { lt: start },
          },
          _sum: { amountMinor: true },
        }),
        prisma.categoryAssignment.findMany({
          where: {
            budgetMonth: {
              month: { lt: month },
            },
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

      const priorActivityMap = new Map(
        carryoverActivity.map((item) => [
          item.categoryId ?? "",
          item._sum.amountMinor ?? 0,
        ]),
      )
      const priorAssignmentMap = new Map<string, number>()

      for (const assignment of carryoverAssignments) {
        priorAssignmentMap.set(
          assignment.categoryId,
          (priorAssignmentMap.get(assignment.categoryId) ?? 0) +
            assignment.assignedMinor,
        )
      }

      const categories: PlanningCategory[] = []

      for (const group of categoryGroups) {
        for (const category of group.categories) {
          const assignedMinor = assignmentMap.get(category.id) ?? 0
          const activityMinor = activityMap.get(category.id) ?? 0
          const priorAvailable =
            (priorAssignmentMap.get(category.id) ?? 0) +
            (priorActivityMap.get(category.id) ?? 0)
          const availableMinor = priorAvailable + assignedMinor + activityMinor

          categories.push({
            categoryId: category.id,
            groupName: group.name,
            categoryName: category.name,
            assignedMinor,
            activityMinor,
            availableMinor,
          })
        }
      }

      const [incomeThroughMonth, totalAssignedThroughMonth] = await Promise.all(
        [
          prisma.transaction.aggregate({
            _sum: { amountMinor: true },
            where: {
              category: {
                isIncomeCategory: true,
              },
              date: { lt: endExclusive },
            },
          }),
          prisma.categoryAssignment.aggregate({
            _sum: { assignedMinor: true },
            where: {
              budgetMonth: {
                month: { lte: month },
              },
            },
          }),
        ],
      )

      const readyToAssignMinor =
        (incomeThroughMonth._sum.amountMinor ?? 0) -
        (totalAssignedThroughMonth._sum.assignedMinor ?? 0)

      await prisma.budgetMonth.update({
        where: { id: budgetMonth.id },
        data: { readyToAssignMinor },
      })

      return {
        month,
        readyToAssignMinor,
        categories,
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
      const budgetMonth = await prisma.budgetMonth.upsert({
        where: { month: input.month },
        update: {},
        create: { month: input.month },
      })

      return prisma.categoryAssignment.upsert({
        where: {
          budgetMonthId_categoryId: {
            budgetMonthId: budgetMonth.id,
            categoryId: input.categoryId,
          },
        },
        update: { assignedMinor: input.assignedMinor },
        create: {
          budgetMonthId: budgetMonth.id,
          categoryId: input.categoryId,
          assignedMinor: input.assignedMinor,
        },
      })
    },
    catch: (error) =>
      new Error(`Unable to set category assignment: ${String(error)}`),
  })
