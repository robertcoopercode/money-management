import { prisma } from "@ledgr/db"
import { Effect } from "effect"

const normalizePayeeName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ")

export const listPayees = Effect.tryPromise({
  try: () =>
    prisma.payee.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { transactions: true } },
        defaultCategory: { select: { id: true, name: true, groupId: true } },
      },
    }),
  catch: (error) => new Error(`Unable to list payees: ${String(error)}`),
})

export const createPayee = (name: string) =>
  Effect.tryPromise({
    try: () =>
      prisma.payee.create({
        data: {
          name: name.trim(),
          normalizedName: normalizePayeeName(name),
        },
      }),
    catch: (error) => new Error(`Unable to create payee: ${String(error)}`),
  })

export const updatePayee = (payeeId: string, data: { name?: string; defaultCategoryId?: string | null }) =>
  Effect.tryPromise({
    try: () =>
      prisma.payee.update({
        where: { id: payeeId },
        data: {
          ...(data.name != null ? { name: data.name.trim(), normalizedName: normalizePayeeName(data.name) } : {}),
          ...(data.defaultCategoryId !== undefined ? { defaultCategoryId: data.defaultCategoryId } : {}),
        },
        include: {
          _count: { select: { transactions: true } },
          defaultCategory: { select: { id: true, name: true, groupId: true } },
        },
      }),
    catch: (error) => new Error(`Unable to update payee: ${String(error)}`),
  })

export const mergePayees = (sourcePayeeId: string, targetPayeeId: string) =>
  Effect.tryPromise({
    try: async () => {
      if (sourcePayeeId === targetPayeeId) {
        throw new Error("Cannot merge a payee into itself.")
      }

      const source = await prisma.payee.findUnique({
        where: { id: sourcePayeeId },
      })
      const target = await prisma.payee.findUnique({
        where: { id: targetPayeeId },
      })

      if (!source || !target) {
        throw new Error("Both payees are required for merge.")
      }

      await prisma.$transaction([
        prisma.transaction.updateMany({
          where: { payeeId: sourcePayeeId },
          data: { payeeId: targetPayeeId },
        }),
        prisma.payee.update({
          where: { id: sourcePayeeId },
          data: { isArchived: true },
        }),
      ])

      return target
    },
    catch: (error) => new Error(`Unable to merge payees: ${String(error)}`),
  })

export const combinePayees = (input: { payeeIds: string[]; newName: string }) =>
  Effect.tryPromise({
    try: async () => {
      if (input.payeeIds.length < 2) {
        throw new Error("At least 2 payees are required to combine.")
      }

      const trimmedName = input.newName.trim()
      const normalized = normalizePayeeName(trimmedName)

      return prisma.$transaction(async (tx) => {
        const sourcePayees = await tx.payee.findMany({
          where: { id: { in: input.payeeIds } },
          select: { defaultCategoryId: true },
        })
        const inheritedDefaultCategoryId =
          sourcePayees.find((p) => p.defaultCategoryId != null)?.defaultCategoryId ?? null

        const newPayee = await tx.payee.create({
          data: { name: trimmedName, normalizedName: normalized, defaultCategoryId: inheritedDefaultCategoryId },
        })

        await tx.transaction.updateMany({
          where: { payeeId: { in: input.payeeIds } },
          data: { payeeId: newPayee.id },
        })

        await tx.transactionSplit.updateMany({
          where: { payeeId: { in: input.payeeIds } },
          data: { payeeId: newPayee.id },
        })

        await tx.payee.deleteMany({
          where: { id: { in: input.payeeIds } },
        })

        return newPayee
      })
    },
    catch: (error) => new Error(`Unable to combine payees: ${String(error)}`),
  })

export const deletePayees = (payeeIds: string[]) =>
  Effect.tryPromise({
    try: async (): Promise<{ count: number }> => {
      if (payeeIds.length === 0) {
        throw new Error("At least one payee ID is required.")
      }

      return prisma.$transaction(async (tx) => {
        await tx.transaction.updateMany({
          where: { payeeId: { in: payeeIds } },
          data: { payeeId: null },
        })

        await tx.transactionSplit.updateMany({
          where: { payeeId: { in: payeeIds } },
          data: { payeeId: null },
        })

        return tx.payee.deleteMany({
          where: { id: { in: payeeIds } },
        })
      })
    },
    catch: (error) => new Error(`Unable to delete payees: ${String(error)}`),
  })

export const listPayeeTransactions = (payeeId: string) =>
  Effect.tryPromise({
    try: () =>
      prisma.transaction.findMany({
        where: { payeeId },
        include: {
          account: true,
          transferAccount: true,
          category: { include: { group: true } },
          origins: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    catch: (error) =>
      new Error(`Unable to load payee transactions: ${String(error)}`),
  })
