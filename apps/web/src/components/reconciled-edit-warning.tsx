type ReconciledEditWarningProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
}

export function ReconciledEditWarning({
  open,
  onOpenChange,
  onContinue,
}: ReconciledEditWarningProps) {
  if (!open) return null

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reconciled-warning-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="reconciled-warning-title">Edit Reconciled Transaction?</h3>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          This transaction has been reconciled. Editing it may cause your
          account balance to no longer match your bank statement.
        </p>
        <div className="dialog-actions">
          <button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="button-danger"
            onClick={() => {
              onContinue()
              onOpenChange(false)
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
