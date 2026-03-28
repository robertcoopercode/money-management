import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Popover } from "@base-ui/react/popover"
import { formatMoney } from "@ledgr/shared"
import { apiFetch } from "../lib/api.js"
import type { Transaction } from "../types.js"

type ActivityPopoverProps = {
  categoryId: string
  categoryName: string
  activityMinor: number
  month: string
  onNavigateToTransaction?: (transactionId: string) => void
}

const lastDayOfMonth = (month: string): string => {
  const [year, mon] = month.split("-").map(Number)
  const d = new Date(year!, mon!, 0)
  return String(d.getDate()).padStart(2, "0")
}

const formatDate = (iso: string): string => {
  const dateStr = iso.slice(0, 10)
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y!, m! - 1, d!)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export const ActivityPopover = ({
  categoryId,
  categoryName,
  activityMinor,
  month,
  onNavigateToTransaction,
}: ActivityPopoverProps) => {
  const [open, setOpen] = useState(false)

  const disabled = activityMinor === 0

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["activity-transactions", categoryId, month],
    queryFn: () => {
      const params = new URLSearchParams({
        categoryId,
        fromDate: `${month}-01`,
        toDate: `${month}-${lastDayOfMonth(month)}`,
        limit: "500",
        sortBy: "date",
        sortDir: "desc",
        includeReconciled: "true",
      })
      return apiFetch<Transaction[]>(`/api/transactions?${params}`)
    },
    enabled: open,
  })

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={`activity-popover-trigger${disabled ? " activity-popover-trigger-disabled" : ""}`}
        disabled={disabled}
      >
        {formatMoney(activityMinor)}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="activity-popover-positioner"
          sideOffset={6}
          side="bottom"
          align="end"
        >
          <Popover.Popup className="activity-popover-popup">
            <div className="activity-popover-header">
              <span className="activity-popover-title">Activity</span>
              <span className="activity-popover-subtitle">{categoryName}</span>
            </div>

            <div className="activity-popover-body">
              {isLoading ? (
                <p className="muted" style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                  Loading...
                </p>
              ) : !transactions || transactions.length === 0 ? (
                <p className="muted" style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                  No transactions found.
                </p>
              ) : (
                <table className="activity-popover-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Date</th>
                      <th>Payee</th>
                      <th>Memo</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const matchingSplit = tx.splits.find(
                        (s) => s.categoryId === categoryId,
                      )
                      const amount = matchingSplit
                        ? matchingSplit.amountMinor
                        : tx.amountMinor
                      const memo = matchingSplit
                        ? (matchingSplit.note ?? tx.note ?? "")
                        : (tx.note ?? "")
                      const payee = matchingSplit?.payee ?? tx.payee
                      return (
                        <tr
                          key={matchingSplit ? `${tx.id}-${matchingSplit.id}` : tx.id}
                          className={onNavigateToTransaction ? "activity-popover-row" : undefined}
                          onClick={onNavigateToTransaction ? () => {
                            onNavigateToTransaction(tx.id)
                            setOpen(false)
                          } : undefined}
                        >
                          <td>{tx.account.name}</td>
                          <td>{formatDate(tx.date)}</td>
                          <td>{payee?.name ?? ""}</td>
                          <td>{memo}</td>
                          <td style={{ textAlign: "right" }}>{formatMoney(amount)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="activity-popover-footer">
              <button
                type="button"
                className="activity-popover-close-btn"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
