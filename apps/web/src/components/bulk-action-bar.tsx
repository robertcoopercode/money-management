type BulkActionBarProps = {
  selectedCount: number
  hasPendingApproval: boolean
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
  onDismiss: () => void
  isApproving: boolean
  isRejecting: boolean
  isDeleting: boolean
}

export function BulkActionBar({
  selectedCount,
  hasPendingApproval,
  onApprove,
  onReject,
  onDelete,
  onDismiss,
  isApproving,
  isRejecting,
  isDeleting,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  const isBusy = isApproving || isRejecting || isDeleting

  return (
    <div className="bulk-action-bar">
      <button
        type="button"
        className="bulk-action-dismiss"
        onClick={onDismiss}
        disabled={isBusy}
        aria-label="Clear selection"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
      <span className="bulk-action-count">
        {selectedCount} transaction{selectedCount !== 1 ? "s" : ""}
      </span>
      <span className="bulk-action-divider" />
      {hasPendingApproval && (
        <>
          <button
            type="button"
            className="bulk-action-button button-success"
            onClick={onApprove}
            disabled={isBusy}
          >
            {isApproving ? "Approving..." : "Approve"}
          </button>
          <button
            type="button"
            className="bulk-action-button button-danger"
            onClick={onReject}
            disabled={isBusy}
          >
            {isRejecting ? "Rejecting..." : "Reject"}
          </button>
        </>
      )}
      <button
        type="button"
        className="bulk-action-button button-danger"
        onClick={onDelete}
        disabled={isBusy}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  )
}
