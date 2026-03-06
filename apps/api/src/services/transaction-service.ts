import { OriginType, Prisma, prisma } from "@money/db"
import type { TransactionFilterInput } from "@money/shared"
import { Effect } from "effect"

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`)

export const listTransactions = (filters: TransactionFilterInput) =>
  Effect.tryPromise({
    try: () =>
      prisma.transaction.findMany({
        where: {
          accountId: filters.accountId,
          categoryId: filters.categoryId,
          payeeId: filters.payeeId,
          cleared: filters.cleared,
          date:
            filters.fromDate || filters.toDate
              ? {
                  gte: filters.fromDate ? toDate(filters.fromDate) : undefined,
                  lte: filters.toDate ? toDate(filters.toDate) : undefined,
                }
              : undefined,
        },
        include: {
          account: true,
          payee: true,
          category: { include: { group: true } },
          origins: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: filters.limit,
      }),
    catch: (error) =>
      new Error(`Unable to list transactions: ${String(error)}`),
  })

export const createTransaction = (input: {
  accountId: string
  date: string
  amountMinor: number
  payeeId?: string
  categoryId?: string
  note?: string
  cleared: boolean
}) =>
  Effect.tryPromise({
    try: async () => {
      const data: Prisma.TransactionUncheckedCreateInput = {
        accountId: input.accountId,
        date: toDate(input.date),
        amountMinor: input.amountMinor,
        payeeId: input.payeeId,
        categoryId: input.categoryId,
        note: input.note,
        cleared: input.cleared,
        manualCreated: true,
      }

      const transaction = await prisma.transaction.create({
        data,
        include: {
          account: true,
          payee: true,
          category: { include: { group: true } },
          origins: true,
        },
      })

      await prisma.transactionOrigin.create({
        data: {
          transactionId: transaction.id,
          originType: OriginType.MANUAL,
        },
      })

      return transaction
    },
    catch: (error) =>
      new Error(`Unable to create transaction: ${String(error)}`),
  })

export const updateTransaction = (
  transactionId: string,
  input: {
    accountId?: string
    date?: string
    amountMinor?: number
    payeeId?: string
    categoryId?: string
    note?: string
    cleared?: boolean
  },
) =>
  Effect.tryPromise({
    try: () =>
      prisma.transaction.update({
        where: { id: transactionId },
        data: {
          accountId: input.accountId,
          date: input.date ? toDate(input.date) : undefined,
          amountMinor: input.amountMinor,
          payeeId: input.payeeId,
          categoryId: input.categoryId,
          note: input.note,
          cleared: input.cleared,
        },
        include: {
          account: true,
          payee: true,
          category: { include: { group: true } },
          origins: true,
        },
      }),
    catch: (error) =>
      new Error(`Unable to update transaction: ${String(error)}`),
  })

export const deleteTransaction = (transactionId: string) =>
  Effect.tryPromise({
    try: () =>
      prisma.transaction.delete({
        where: { id: transactionId },
      }),
    catch: (error) =>
      new Error(`Unable to delete transaction: ${String(error)}`),
  })
