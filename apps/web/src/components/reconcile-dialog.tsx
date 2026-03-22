import { useState } from "react"
import { formatMoney } from "@ledgr/shared"
import { TextInput } from "./text-input.js"
import { AppDialog } from "./app-dialog.js"

type ReconcileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clearedBalanceMinor: number
  onConfirm: (statementBalanceMinor: number) => void
  isPending: boolean
}

export function ReconcileDialog({
  open,
  onOpenChange,
  clearedBalanceMinor,
  onConfirm,
  isPending,
}: ReconcileDialogProps) {
  const [statementAmount, setStatementAmount] = useState("")

  const statementBalanceMinor = Math.round(
    Number(statementAmount.replace(/[$,\s]/g, "") || "0") * 100,
  )
  const difference = statementBalanceMinor - clearedBalanceMinor
  const matches = difference === 0 && statementAmount !== ""

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reconcile Account"
    >
      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        Enter your bank statement balance to reconcile.
      </p>

      <div className="reconcile-form">
        <div className="reconcile-balance-display">
          <span className="reconcile-label">Cleared balance:</span>
          <span className="reconcile-value">{formatMoney(clearedBalanceMinor)}</span>
        </div>

        <label className="reconcile-input-label">
          Bank statement balance:
          <TextInput
            type="text"
            className="reconcile-input"
            value={statementAmount}
            onChange={(e) => setStatementAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </label>

        {statementAmount && (
          <div className={`reconcile-message ${matches ? "reconcile-match" : "reconcile-adjustment"}`}>
            {matches
              ? "All clear! All cleared transactions will be reconciled."
              : `An adjustment of ${formatMoney(difference)} will be created to match your statement.`}
          </div>
        )}

        <div className="dialog-actions">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button-success"
            disabled={!statementAmount || isPending}
            onClick={() => onConfirm(statementBalanceMinor)}
          >
            {isPending ? "Reconciling..." : "Reconcile"}
          </button>
        </div>
      </div>
    </AppDialog>
  )
}
