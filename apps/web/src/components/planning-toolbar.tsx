import { formatMoney } from "@ledgr/shared"
import { Menu } from "@base-ui/react/menu"
import { Tooltip } from "@base-ui/react/tooltip"
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
  onAutoCover: () => void
  autoCoverDisabled: boolean
}

export const PlanningToolbar = ({
  month,
  onMonthChange,
  readyToAssignMinor,
  onAutoCover,
  autoCoverDisabled,
}: PlanningToolbarProps) => (
  <div className="planning-header">
    <div className="planning-header-left">
      <button
        type="button"
        className="planning-month-chevron"
        onClick={() => onMonthChange((current) => shiftMonth(current, -1))}
        title="Previous month"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="planning-month-title">{formatMonthLabel(month)}</span>
      <button
        type="button"
        className="planning-month-chevron"
        onClick={() => onMonthChange((current) => shiftMonth(current, 1))}
        title="Next month"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>
    </div>
    <Menu.Root>
      <Menu.Trigger className="ready-to-assign-pill">
        <span className="ready-to-assign-label">Ready to Assign</span>
        <span className="ready-to-assign-amount">
          {formatMoney(readyToAssignMinor)}
        </span>
        <svg className="ready-to-assign-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="rta-menu-positioner" sideOffset={6} side="bottom" align="end">
          <Menu.Popup className="rta-menu-popup">
            {autoCoverDisabled ? (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<div />} className="rta-menu-item rta-menu-item-disabled">
                    Auto Assign
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={6} side="right">
                      <Tooltip.Popup className="app-tooltip">
                        No underfunded categories to cover
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            ) : (
              <Menu.Item className="rta-menu-item" onClick={onAutoCover}>
                Auto Assign
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  </div>
)
