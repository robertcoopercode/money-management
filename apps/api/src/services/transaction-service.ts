import { randomUUID } from "node:crypto"
import { OriginType, Prisma, prisma } from "@ledgr/db"
import type {
  TransactionFilterInput,
  TransactionSortColumn,
  TransactionSortDir,
  TransactionSplitInput,
} from "@ledgr/shared"
import { Effect } from "effect"
import { toMirrorTransferAmountMinor } from "../domain/transfer.js"

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`)

const buildOrderBy = (
  sortBy: TransactionSortColumn,
  sortDir: TransactionSortDir,
): Prisma.TransactionOrderByWithRelationInput[] => {
  const primary: Prisma.TransactionOrderByWithRelationInput =
    sortBy === "account"
      ? { account: { name: sortDir } }
      : sortBy === "payee"
        ? { payee: { name: sortDir } }
        : sortBy === "category"
          ? { category: { name: sortDir } }
          : { [sortBy]: sortDir }

  const secondary: Prisma.TransactionOrderByWithRelationInput[] =
    sortBy === "date"
      ? [{ createdAt: "desc" }]
      : [{ date: "desc" }, { createdAt: "desc" }]

  return [primary, ...secondary]
}

const transactionInclude = {
  account: true,
  payee: true,
  category: { include: { group: true } },
  transferAccount: true,
  origins: true,
  splits: {
    include: {
      category: { include: { group: true } },
      payee: true,
      tags: { include: { tag: true } },
    },
    orderBy: { sortOrder: "asc" as const },
  },
  tags: {
    include: { tag: true },
  },
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
        orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
        take: filters.limit,
        skip: filters.offset,
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
  splits?: TransactionSplitInput[]
  tagIds?: string[]
}) =>
  Effect.tryPromise({
    try: async () => {
      if (input.transferAccountId === input.accountId) {
        throw new Error(
          "Transfer account cannot be the same as source account.",
        )
      }

      const hasSplits = input.splits && input.splits.length > 0
      const transferPairId = input.transferAccountId ? randomUUID() : null

      // Check if this is a loan transfer (category allowed)
      let isLoanTransfer = false
      if (input.transferAccountId) {
        const [sourceAccount, targetAccount] = await Promise.all([
          prisma.account.findUnique({
            where: { id: input.accountId },
            select: { type: true },
          }),
          prisma.account.findUnique({
            where: { id: input.transferAccountId },
            select: { type: true },
          }),
        ])
        isLoanTransfer =
          sourceAccount?.type === "LOAN" || targetAccount?.type === "LOAN"
      }

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
              categoryId:
                (input.transferAccountId && !isLoanTransfer) || hasSplits
                  ? undefined
                  : input.categoryId,
              note: input.note,
              cleared: input.cleared,
              manualCreated: true,
              isTransfer: Boolean(input.transferAccountId),
            },
          })

          if (hasSplits) {
            for (const [i, split] of input.splits!.entries()) {
              const created = await transactionDb.transactionSplit.create({
                data: {
                  transactionId: source.id,
                  categoryId: split.categoryId,
                  payeeId: split.payeeId,
                  note: split.note,
                  amountMinor: split.amountMinor,
                  sortOrder: i,
                },
              })
              if (split.tagIds && split.tagIds.length > 0) {
                await transactionDb.splitTag.createMany({
                  data: split.tagIds.map((tagId) => ({
                    splitId: created.id,
                    tagId,
                  })),
                })
              }
            }
          }

          await transactionDb.transactionOrigin.create({
            data: {
              transactionId: source.id,
              originType: OriginType.MANUAL,
            },
          })

          if (input.tagIds && input.tagIds.length > 0) {
            await transactionDb.transactionTag.createMany({
              data: input.tagIds.map((tagId) => ({
                transactionId: source.id,
                tagId,
              })),
            })
          }

          if (input.transferAccountId) {
            const mirror = await transactionDb.transaction.create({
              data: {
                accountId: input.transferAccountId,
                transferAccountId: input.accountId,
                transferPairId,
                date: toDate(input.date),
                amountMinor: toMirrorTransferAmountMinor(input.amountMinor),
                payeeId: input.payeeId,
                categoryId: isLoanTransfer ? input.categoryId : undefined,
                note: input.note,
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

          // Auto-learn: set payee's default category if it doesn't have one
          if (input.payeeId && input.categoryId && !input.transferAccountId && !hasSplits) {
            await transactionDb.payee.updateMany({
              where: { id: input.payeeId, defaultCategoryId: null },
              data: { defaultCategoryId: input.categoryId },
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
    splits?: TransactionSplitInput[]
    tagIds?: string[]
  },
) =>
  Effect.tryPromise({
    try: async () => {
      const existing = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: {
          id: true,
          accountId: true,
          transferAccountId: true,
          categoryId: true,
          transferPairId: true,
          isTransfer: true,
          account: { select: { type: true } },
          transferAccount: { select: { type: true } },
        },
      })

      if (!existing) {
        throw new Error("Transaction not found.")
      }

      if (input.splits && input.splits.length > 0 && existing.isTransfer) {
        throw new Error("Split transactions cannot be transfers.")
      }

      const existingIsLoanTransfer =
        existing.account.type === "LOAN" ||
        existing.transferAccount?.type === "LOAN"

      if (
        existing.transferPairId &&
        ((input.accountId !== undefined &&
          input.accountId !== existing.accountId) ||
          (input.transferAccountId !== undefined &&
            input.transferAccountId !== existing.transferAccountId) ||
          (input.categoryId !== undefined &&
            input.categoryId !== existing.categoryId &&
            !existingIsLoanTransfer))
      ) {
        throw new Error(
          "Changing transfer accounts/categories requires recreating the transfer.",
        )
      }

      const hasSplits = input.splits !== undefined && input.splits.length > 0

      if (!existing.transferPairId) {
        return prisma.$transaction(async (transactionDb) => {
          await transactionDb.transaction.update({
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
              categoryId: hasSplits ? null : input.categoryId,
              note: input.note,
              cleared: input.cleared,
            },
          })

          if (input.splits !== undefined) {
            await transactionDb.transactionSplit.deleteMany({
              where: { transactionId },
            })

            if (input.splits.length > 0) {
              for (const [i, split] of input.splits.entries()) {
                const created = await transactionDb.transactionSplit.create({
                  data: {
                    transactionId,
                    categoryId: split.categoryId,
                    payeeId: split.payeeId,
                    note: split.note,
                    amountMinor: split.amountMinor,
                    sortOrder: i,
                  },
                })
                if (split.tagIds && split.tagIds.length > 0) {
                  await transactionDb.splitTag.createMany({
                    data: split.tagIds.map((tagId) => ({
                      splitId: created.id,
                      tagId,
                    })),
                  })
                }
              }
            }
          }

          if (input.tagIds !== undefined) {
            await transactionDb.transactionTag.deleteMany({
              where: { transactionId },
            })
            if (input.tagIds.length > 0) {
              await transactionDb.transactionTag.createMany({
                data: input.tagIds.map((tagId) => ({
                  transactionId,
                  tagId,
                })),
              })
            }
          }

          // Auto-learn: set payee's default category if it doesn't have one
          if (input.payeeId && input.categoryId && !input.transferAccountId && !hasSplits) {
            await transactionDb.payee.updateMany({
              where: { id: input.payeeId, defaultCategoryId: null },
              data: { defaultCategoryId: input.categoryId },
            })
          }

          return transactionDb.transaction.findUniqueOrThrow({
            where: { id: transactionId },
            include: transactionInclude,
          })
        })
      }

      return prisma.$transaction(async (transactionDb) => {
        await transactionDb.transaction.update({
          where: { id: transactionId },
          data: {
            date: input.date ? toDate(input.date) : undefined,
            amountMinor: input.amountMinor,
            payeeId: input.payeeId,
            categoryId: existingIsLoanTransfer ? input.categoryId : undefined,
            note: input.note,
            cleared: input.cleared,
          },
        })

        const mirror = await transactionDb.transaction.findFirst({
          where: {
            transferPairId: existing.transferPairId,
            id: { not: transactionId },
          },
          select: { id: true },
        })

        if (mirror) {
          await transactionDb.transaction.update({
            where: { id: mirror.id },
            data: {
              date: input.date ? toDate(input.date) : undefined,
              amountMinor:
                input.amountMinor !== undefined
                  ? toMirrorTransferAmountMinor(input.amountMinor)
                  : undefined,
              payeeId: input.payeeId,
              categoryId: existingIsLoanTransfer ? input.categoryId : undefined,
              note:
                input.note !== undefined
                  ? input.note
                  : undefined,
              cleared: input.cleared,
            },
          })
        }

        if (input.tagIds !== undefined) {
          await transactionDb.transactionTag.deleteMany({
            where: { transactionId },
          })
          if (input.tagIds.length > 0) {
            await transactionDb.transactionTag.createMany({
              data: input.tagIds.map((tagId) => ({
                transactionId,
                tagId,
              })),
            })
          }
        }

        return transactionDb.transaction.findUniqueOrThrow({
          where: { id: transactionId },
          include: transactionInclude,
        })
      })
    },
    catch: (error) =>
      new Error(`Unable to update transaction: ${error instanceof Error ? error.message : String(error)}`),
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
