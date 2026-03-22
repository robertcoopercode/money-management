import type { Account, Prisma } from "@ledgr/db"
import { prisma } from "@ledgr/db"
import { Effect } from "effect"

export const listAccounts = Effect.tryPromise({
  try: () =>
    prisma.account.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        transactions: {
          select: {
            amountMinor: true,
            clearingStatus: true,
          },
        },
        loanProfile: true,
      },
    }),
  catch: (error) => new Error(`Unable to list accounts: ${String(error)}`),
}).pipe(
  Effect.map((accounts) =>
    accounts.map((account) => {
      const { transactions, loanProfile, ...rest } = account
      const transactionTotal = transactions.reduce(
        (sum, item) => sum + item.amountMinor,
        0,
      )
      const clearedAndReconciledTotal = transactions
        .filter((t) => t.clearingStatus === "CLEARED" || t.clearingStatus === "RECONCILED")
        .reduce((sum, item) => sum + item.amountMinor, 0)
      const unclearedTotal = transactions
        .filter((t) => t.clearingStatus === "UNCLEARED")
        .reduce((sum, item) => sum + item.amountMinor, 0)

      return {
        ...rest,
        isActive: account.isActive,
        clearedBalanceMinor: account.startingBalanceMinor + clearedAndReconciledTotal,
        unclearedBalanceMinor: unclearedTotal,
        balanceMinor: account.startingBalanceMinor + transactionTotal,
        loanProfile: loanProfile
          ? {
              loanType: loanProfile.loanType,
              interestRateAnnual: Number(loanProfile.interestRateAnnual),
              minimumPaymentMinor: loanProfile.minimumPaymentMinor,
            }
          : null,
      }
    }),
  ),
)

export const createAccount = (input: Prisma.AccountCreateInput) =>
  Effect.tryPromise({
    try: () =>
      prisma.account.create({ data: input, include: { loanProfile: true } }),
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
