import type { Transaction } from "../types.js"

export const TransactionBadge = ({
  transaction,
}: {
  transaction: Transaction
}) => {
  const isImported = transaction.origins.some(
    (origin) => origin.originType === "CSV_IMPORT",
  )
  const isMerged =
    isImported &&
    transaction.origins.some((origin) => origin.originType === "MANUAL") &&
    transaction.origins.length > 1

  return (
    <div className="badge-stack">
      {transaction.clearingStatus !== "UNCLEARED" ? (
        <span className="badge badge-cleared">
          {transaction.clearingStatus === "RECONCILED" ? "Reconciled" : "Cleared"}
        </span>
      ) : null}
      {isImported ? (
        <span className="badge badge-imported">Imported</span>
      ) : null}
      {isMerged ? <span className="badge badge-merged">Matched</span> : null}
    </div>
  )
}
