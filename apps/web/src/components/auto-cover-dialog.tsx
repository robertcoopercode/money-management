import { formatMoney } from "@ledgr/shared"

export type AutoCoverItem = {
  categoryId: string
  categoryName: string
  currentAssignedMinor: number
  newAssignedMinor: number
  deficitMinor: number
}

type AutoCoverDialogProps = {
  items: AutoCoverItem[]
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export const AutoCoverDialog = ({
  items,
  onClose,
  onConfirm,
  isPending,
}: AutoCoverDialogProps) => {
  if (items.length === 0) return null

  const totalDeficit = items.reduce((sum, item) => sum + item.deficitMinor, 0)

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog-card dialog-card-wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>Auto-Cover Underfunded Categories</h3>
        <p style={{ margin: "0.5rem 0", fontSize: "0.88rem" }}>
          The following {items.length} categor{items.length === 1 ? "y" : "ies"} will
          have {items.length === 1 ? "its" : "their"} assignment increased to cover
          the deficit. This will reduce Ready to Assign by{" "}
          <strong>{formatMoney(totalDeficit)}</strong>.
        </p>

        <div style={{ maxHeight: "20rem", overflow: "auto", margin: "0.5rem 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgb(95 117 171 / 18%)" }}>
                <th style={{ padding: "0.35rem 0.5rem" }}>Category</th>
                <th style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>Current</th>
                <th style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>Increase</th>
                <th style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>New</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.categoryId}
                  style={{ borderBottom: "1px solid rgb(95 117 171 / 10%)" }}
                >
                  <td style={{ padding: "0.35rem 0.5rem" }}>{item.categoryName}</td>
                  <td style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>
                    {formatMoney(item.currentAssignedMinor)}
                  </td>
                  <td style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>
                    +{formatMoney(item.deficitMinor)}
                  </td>
                  <td style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>
                    {formatMoney(item.newAssignedMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dialog-actions">
          <button
            onClick={onClose}
            style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}
          >
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}>
            {isPending ? "Covering..." : "Cover All"}
          </button>
        </div>
      </div>
    </div>
  )
}
