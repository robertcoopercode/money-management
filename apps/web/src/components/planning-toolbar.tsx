import { formatMoney } from "@ledgr/shared"
import { shiftMonth } from "../lib/date-helpers.js"

const formatMonthLabel = (month: string) => {
  const [year, m] = month.split("-")
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleString("default", { month: "long", year: "numeric" })
}

type PlanningToolbarProps = {
  month: string
  onMonthChange: (updater: (current: string) => string) => void
  readyToAssignMinor: number
  onCreateGroup: () => void
  onAutoCover: () => void
  autoCoverDisabled: boolean
}

export const PlanningToolbar = ({
  month,
  onMonthChange,
  readyToAssignMinor,
  onCreateGroup,
  onAutoCover,
  autoCoverDisabled,
}: PlanningToolbarProps) => (
  <div className="planning-header">
    <div className="planning-header-left">
      <h2>Budget · {formatMonthLabel(month)}</h2>
      <button
        type="button"
        onClick={() => onMonthChange((current) => shiftMonth(current, -1))}
      >
        Previous
      </button>
      <button
        type="button"
        onClick={() => onMonthChange((current) => shiftMonth(current, 1))}
      >
        Next
      </button>
      <button type="button" onClick={onCreateGroup}>
        + Category Group
      </button>
      <button type="button" onClick={onAutoCover} disabled={autoCoverDisabled}>
        Auto-Cover
      </button>
    </div>
    <div className="ready-to-assign-pill">
      <span className="ready-to-assign-label">Ready to Assign</span>
      <span className="ready-to-assign-amount">
        {formatMoney(readyToAssignMinor)}
      </span>
    </div>
  </div>
)
