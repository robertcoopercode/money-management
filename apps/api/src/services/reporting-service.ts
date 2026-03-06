import { prisma } from "@money/db"
import { Effect } from "effect"

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

export type ReportFilters = {
  fromDate?: string
  toDate?: string
  accountIds?: string[]
  categoryIds?: string[]
}

export const getReports = (filters: ReportFilters) =>
  Effect.tryPromise({
    try: async () => {
      const transactions = await prisma.transaction.findMany({
        where: {
          isTransfer: false,
          date: {
            gte: filters.fromDate
              ? new Date(`${filters.fromDate}T00:00:00.000Z`)
              : undefined,
            lte: filters.toDate
              ? new Date(`${filters.toDate}T23:59:59.999Z`)
              : undefined,
          },
          accountId: filters.accountIds?.length
            ? { in: filters.accountIds }
            : undefined,
          categoryId: filters.categoryIds?.length
            ? { in: filters.categoryIds }
            : undefined,
        },
        include: {
          category: {
            include: { group: true },
          },
        },
      })

      const spendingByCategory = new Map<string, {
        categoryId: string
        groupName: string
        categoryName: string
        totalMinor: number
      }>()
      const incomeExpenseByMonth = new Map<string, {
        month: string
        incomeMinor: number
        expenseMinor: number
      }>()

      for (const transaction of transactions) {
        const categoryKey = transaction.categoryId ?? "uncategorized"
        const groupName = transaction.category?.group.name ?? "Uncategorized"
        const categoryName = transaction.category?.name ?? "Uncategorized"
        const existingCategory = spendingByCategory.get(categoryKey)

        if (transaction.amountMinor < 0) {
          spendingByCategory.set(categoryKey, {
            categoryId: categoryKey,
            groupName,
            categoryName,
            totalMinor:
              (existingCategory?.totalMinor ?? 0) +
              Math.abs(transaction.amountMinor),
          })
        }

        const key = monthKey(transaction.date)
        const currentMonth = incomeExpenseByMonth.get(key) ?? {
          month: key,
          incomeMinor: 0,
          expenseMinor: 0,
        }

        if (transaction.amountMinor >= 0) {
          currentMonth.incomeMinor += transaction.amountMinor
        } else {
          currentMonth.expenseMinor += Math.abs(transaction.amountMinor)
        }

        incomeExpenseByMonth.set(key, currentMonth)
      }

      return {
        spendingByCategory: [...spendingByCategory.values()].sort(
          (a, b) => b.totalMinor - a.totalMinor,
        ),
        incomeExpenseByMonth: [...incomeExpenseByMonth.values()].sort((a, b) =>
          a.month.localeCompare(b.month),
        ),
      }
    },
    catch: (error) => new Error(`Unable to load reports: ${String(error)}`),
  })
