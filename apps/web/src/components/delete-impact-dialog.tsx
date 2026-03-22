export type CategoryDeleteImpact = {
  transactions: number
  splits: number
  assignments: number
  payeeDefaults: number
}

export type CategoryGroupDeleteImpact = {
  categories: number
}

type DeleteDialogState =
  | { type: "category"; id: string; name: string; impact: CategoryDeleteImpact }
  | { type: "group"; id: string; name: string; impact: CategoryGroupDeleteImpact }
  | null

type DeleteImpactDialogProps = {
  state: DeleteDialogState
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export const DeleteImpactDialog = ({
  state,
  onClose,
  onConfirm,
  isPending,
}: DeleteImpactDialogProps) => {
  if (!state) return null

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>
          Delete {state.type === "group" ? "group" : "category"} &ldquo;{state.name}&rdquo;?
        </h3>
        <div style={{ margin: 0, fontSize: "0.88rem" }}>
          {state.type === "group" ? (
            <>
              {state.impact.categories > 0 ? (
                <p>
                  {state.impact.categories} categor{state.impact.categories === 1 ? "y" : "ies"} will be moved to Uncategorized.
                </p>
              ) : (
                <p>This group has no categories.</p>
              )}
            </>
          ) : (
            <p>
              {state.impact.transactions > 0
                ? `${state.impact.transactions} transaction${state.impact.transactions === 1 ? "" : "s"} will have this category cleared. `
                : ""}
              {state.impact.splits > 0
                ? `${state.impact.splits} split line${state.impact.splits === 1 ? "" : "s"} will be deleted. `
                : ""}
              {state.impact.assignments > 0
                ? `${state.impact.assignments} budget assignment${state.impact.assignments === 1 ? "" : "s"} will be removed. `
                : ""}
              {state.impact.payeeDefaults > 0
                ? `${state.impact.payeeDefaults} payee default${state.impact.payeeDefaults === 1 ? "" : "s"} will be cleared. `
                : ""}
              {state.impact.transactions === 0 &&
              state.impact.splits === 0 &&
              state.impact.assignments === 0 &&
              state.impact.payeeDefaults === 0
                ? "No transactions or assignments are affected."
                : ""}
            </p>
          )}
          <p>This cannot be undone.</p>
        </div>
        <div className="dialog-actions">
          <button
            onClick={onClose}
            style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}
          >
            Cancel
          </button>
          <button
            className="button-danger"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

export type { DeleteDialogState }
