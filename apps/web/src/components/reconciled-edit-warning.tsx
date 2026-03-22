import { AppDialog } from "./app-dialog.js"

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
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Reconciled Transaction?"
    >
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
    </AppDialog>
  )
}
