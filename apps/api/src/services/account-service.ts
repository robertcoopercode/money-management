import type { Account, Prisma } from "@money/db"
import { prisma } from "@money/db"
import { Effect } from "effect"

export const listAccounts = Effect.tryPromise({
  try: () =>
    prisma.account.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        transactions: {
          select: {
            amountMinor: true,
          },
        },
      },
    }),
  catch: (error) => new Error(`Unable to list accounts: ${String(error)}`),
}).pipe(
  Effect.map((accounts) =>
    accounts.map((account) => {
      const { transactions, ...rest } = account
      const transactionTotal = transactions.reduce(
        (sum, item) => sum + item.amountMinor,
        0,
      )

      return {
        ...rest,
        balanceMinor: account.startingBalanceMinor + transactionTotal,
      }
    }),
  ),
)

export const createAccount = (input: Prisma.AccountUncheckedCreateInput) =>
  Effect.tryPromise({
    try: () => prisma.account.create({ data: input }),
    catch: (error) => new Error(`Unable to create account: ${String(error)}`),
  })

export const updateAccount = (
  accountId: string,
  input: Prisma.AccountUncheckedUpdateInput,
) =>
  Effect.tryPromise({
    try: () =>
      prisma.account.update({
        where: { id: accountId },
        data: input,
      }),
    catch: (error) => new Error(`Unable to update account: ${String(error)}`),
  })

export const archiveAccount = (accountId: Account["id"]) =>
  Effect.tryPromise({
    try: () =>
      prisma.account.update({
        where: { id: accountId },
        data: { isActive: false },
      }),
    catch: (error) => new Error(`Unable to archive account: ${String(error)}`),
  })
