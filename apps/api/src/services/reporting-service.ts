import { prisma } from "@ledgr/db"
import { Effect } from "effect"
import { aggregateReportingMetrics, aggregateCategoryReport } from "../domain/reporting.js"

export type ReportFilters = {
  fromDate?: string
  toDate?: string
  accountIds?: string[]
  categoryIds?: string[]
  payeeIds?: string[]
  clearingStatus?: "UNCLEARED" | "CLEARED" | "RECONCILED"
}

export const getReports = (filters: ReportFilters) =>
  Effect.tryPromise({
    try: async () => {
      const transactionWhere = {
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
        payeeId: filters.payeeIds?.length
          ? { in: filters.payeeIds }
          : undefined,
        clearingStatus: filters.clearingStatus,
      } as const

      const [transactions, scopedAccounts] = await Promise.all([
        prisma.transaction.findMany({
          where: transactionWhere,
          include: {
            category: {
              include: { group: true },
            },
            splits: {
              include: {
                category: { include: { group: true } },
              },
            },
          },
        }),
        prisma.account.findMany({
          where: {
            isActive: true,
            id: filters.accountIds?.length
              ? { in: filters.accountIds }
              : undefined,
          },
          select: {
            id: true,
            startingBalanceMinor: true,
          },
        }),
      ])

      const startingBalanceMinorTotal = scopedAccounts.reduce(
        (sum, account) => sum + account.startingBalanceMinor,
        0,
      )
      return aggregateReportingMetrics({
        transactions,
        startingBalanceMinorTotal,
      })
    },
    catch: (error) => new Error(`Unable to load reports: ${String(error)}`),
  })

export const getCategoryReport = (filters: ReportFilters) =>
  Effect.tryPromise({
    try: async () => {
      const now = new Date()
      const fromDate = filters.fromDate
        ? new Date(`${filters.fromDate}T00:00:00.000Z`)
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))
      const toDate = filters.toDate
        ? new Date(`${filters.toDate}T23:59:59.999Z`)
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999))

      const transactions = await prisma.transaction.findMany({
        where: {
          isTransfer: false,
          date: { gte: fromDate, lte: toDate },
          accountId: filters.accountIds?.length
            ? { in: filters.accountIds }
            : undefined,
          categoryId: filters.categoryIds?.length
            ? { in: filters.categoryIds }
            : undefined,
          payeeId: filters.payeeIds?.length
            ? { in: filters.payeeIds }
            : undefined,
          clearingStatus: filters.clearingStatus,
        },
        include: {
          category: { include: { group: true } },
          splits: {
            include: {
              category: { include: { group: true } },
            },
          },
        },
      })

      return aggregateCategoryReport(transactions, fromDate, toDate)
    },
    catch: (error) =>
      new Error(`Unable to load category report: ${String(error)}`),
  })
