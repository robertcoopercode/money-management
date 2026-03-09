import { prisma } from "@ledgr/db"
import { Effect } from "effect"

const normalizePayeeName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ")

export const listPayees = Effect.tryPromise({
  try: () =>
    prisma.payee.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
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
