import { randomUUID } from "node:crypto"
import { OriginType, Prisma, prisma } from "@money/db"
import type { TransactionFilterInput } from "@money/shared"
import { Effect } from "effect"
import {
  buildMirrorTransferNote,
  toMirrorTransferAmountMinor,
} from "../domain/transfer.js"

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`)

const transactionInclude = {
  account: true,
  payee: true,
  category: { include: { group: true } },
  transferAccount: true,
  origins: true,
} satisfies Prisma.TransactionInclude

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
          ...transactionInclude,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: filters.limit,
      }),
    catch: (error) =>
      new Error(`Unable to list transactions: ${String(error)}`),
  })

export const createTransaction = (input: {
  accountId: string
  transferAccountId?: string
  date: string
  amountMinor: number
  payeeId?: string
  categoryId?: string
  note?: string
  cleared: boolean
}) =>
  Effect.tryPromise({
    try: async () => {
      if (input.transferAccountId === input.accountId) {
        throw new Error(
          "Transfer account cannot be the same as source account.",
        )
      }

      const transferPairId = input.transferAccountId ? randomUUID() : null

      const sourceTransaction = await prisma.$transaction(
        async (transactionDb) => {
          const source = await transactionDb.transaction.create({
            data: {
              accountId: input.accountId,
              transferAccountId: input.transferAccountId,
              transferPairId,
              date: toDate(input.date),
              amountMinor: input.amountMinor,
              payeeId: input.payeeId,
              categoryId: input.transferAccountId
                ? undefined
                : input.categoryId,
              note: input.note,
              cleared: input.cleared,
              manualCreated: true,
              isTransfer: Boolean(input.transferAccountId),
            },
          })

          await transactionDb.transactionOrigin.create({
            data: {
              transactionId: source.id,
              originType: OriginType.MANUAL,
            },
          })

          if (input.transferAccountId) {
            const mirror = await transactionDb.transaction.create({
              data: {
                accountId: input.transferAccountId,
                transferAccountId: input.accountId,
                transferPairId,
                date: toDate(input.date),
                amountMinor: toMirrorTransferAmountMinor(input.amountMinor),
                payeeId: input.payeeId,
                note: buildMirrorTransferNote(input.note),
                cleared: input.cleared,
                manualCreated: true,
                isTransfer: true,
              },
            })

            await transactionDb.transactionOrigin.create({
              data: {
                transactionId: mirror.id,
                originType: OriginType.MANUAL,
              },
            })
          }

          return transactionDb.transaction.findUniqueOrThrow({
            where: { id: source.id },
            include: transactionInclude,
          })
        },
      )

      return sourceTransaction
    },
    catch: (error) =>
      new Error(`Unable to create transaction: ${String(error)}`),
  })

export const updateTransaction = (
  transactionId: string,
  input: {
    accountId?: string
    transferAccountId?: string
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
          transferAccountId: input.transferAccountId,
          isTransfer:
            input.transferAccountId !== undefined
              ? Boolean(input.transferAccountId)
              : undefined,
          date: input.date ? toDate(input.date) : undefined,
          amountMinor: input.amountMinor,
          payeeId: input.payeeId,
          categoryId: input.categoryId,
          note: input.note,
          cleared: input.cleared,
        },
        include: {
          ...transactionInclude,
        },
      }),
    catch: (error) =>
      new Error(`Unable to update transaction: ${String(error)}`),
  })

export const deleteTransaction = (transactionId: string) =>
  Effect.tryPromise({
    try: async () => {
      const existing = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: {
          transferPairId: true,
        },
      })

      if (!existing) {
        return null
      }

      if (existing.transferPairId) {
        await prisma.transaction.deleteMany({
          where: {
            transferPairId: existing.transferPairId,
          },
        })
        return null
      }

      await prisma.transaction.delete({
        where: { id: transactionId },
      })
      return null
    },
    catch: (error) =>
      new Error(`Unable to delete transaction: ${String(error)}`),
  })
