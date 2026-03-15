import { ClearingStatus, OriginType, prisma } from "@ledgr/db"
import { Effect } from "effect"

export const reconcileAccount = (
  accountId: string,
  statementBalanceMinor: number,
) =>
  Effect.tryPromise({
    try: async () => {
      return prisma.$transaction(async (tx) => {
        const account = await tx.account.findUniqueOrThrow({
          where: { id: accountId },
          select: { startingBalanceMinor: true },
        })

        const clearedAndReconciled = await tx.transaction.aggregate({
          where: {
            accountId,
            clearingStatus: { in: [ClearingStatus.CLEARED, ClearingStatus.RECONCILED] },
          },
          _sum: { amountMinor: true },
        })

        const clearedBalance =
          account.startingBalanceMinor +
          (clearedAndReconciled._sum.amountMinor ?? 0)

        const difference = statementBalanceMinor - clearedBalance

        let adjustmentTransaction = null

        if (difference !== 0) {
          adjustmentTransaction = await tx.transaction.create({
            data: {
              accountId,
              date: new Date(),
              amountMinor: difference,
              clearingStatus: ClearingStatus.CLEARED,
              note: "Reconciliation adjustment",
              manualCreated: true,
              origins: {
                create: { originType: OriginType.MANUAL },
              },
            },
          })
        }

        const result = await tx.transaction.updateMany({
          where: {
            accountId,
            clearingStatus: ClearingStatus.CLEARED,
          },
          data: {
            clearingStatus: ClearingStatus.RECONCILED,
          },
        })

        return {
          reconciledCount: result.count,
          adjustmentTransaction,
        }
      })
    },
    catch: (error) =>
      new Error(`Unable to reconcile account: ${String(error)}`),
  })
