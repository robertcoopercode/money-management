import { useMemo } from "react"
import { formatMoney, parseMoneyInputToMinor } from "@ledgr/shared"
import { TextInput } from "../components/text-input.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { shiftMonth } from "../lib/date-helpers.js"
import { usePlanningMutations } from "../hooks/use-planning-mutations.js"
import type { PlanningResponse } from "../types.js"

type PlanningTabProps = {
  month: string
  onMonthChange: (updater: (current: string) => string) => void
  planningData: PlanningResponse | undefined
  planningIsLoading: boolean
  planningIsError: boolean
  planningError: Error | null
  refetchCoreData: () => void
}

export const PlanningTab = ({
  month,
  onMonthChange,
  planningData,
  planningIsLoading,
  planningIsError,
  planningError,
  refetchCoreData,
}: PlanningTabProps) => {
  const { assignMutation } = usePlanningMutations({
    month,
    refetchCoreData,
  })

  const groupedPlanningRows = useMemo(() => {
    const groups = new Map<
      string,
      NonNullable<PlanningResponse["categories"]>[number][]
    >()
    for (const category of planningData?.categories ?? []) {
      groups.set(category.groupName, [
        ...(groups.get(category.groupName) ?? []),
        category,
      ])
    }
    return [...groups.entries()]
  }, [planningData])

  return (
    <section className="card">
      <div className="planning-header">
        <h2>Planning · {month}</h2>
        <div className="inline-controls">
          <div className="ready-to-assign-pill">
            <span className="ready-to-assign-label">Ready to Assign</span>
            <span className="ready-to-assign-amount">
              {formatMoney(planningData?.readyToAssignMinor ?? 0)}
            </span>
          </div>
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
        </div>
      </div>
      {planningIsError ? (
        <p className="error-text">
          {toDisplayErrorMessage(
            planningError,
            "Failed to load planning data.",
          )}
        </p>
      ) : null}

      {planningIsLoading ? (
        <p className="muted">Loading planning data...</p>
      ) : groupedPlanningRows.length === 0 ? (
        <p className="muted">
          No planning categories available yet. Run database seed data.
        </p>
      ) : (
        groupedPlanningRows.map(([groupName, rows]) => (
          <div className="planning-group" key={groupName}>
            <h3>{groupName}</h3>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Assigned</th>
                  <th>Activity</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.categoryId}>
                    <td>{row.categoryName}</td>
                    <td>
                      <TextInput
                        className="small-input"
                        defaultValue={(row.assignedMinor / 100).toString()}
                        onBlur={(event) =>
                          assignMutation.mutate({
                            categoryId: row.categoryId,
                            assignedMinor: parseMoneyInputToMinor(
                              event.target.value,
                            ),
                          })
                        }
                      />
                    </td>
                    <td>{formatMoney(row.activityMinor)}</td>
                    <td>{formatMoney(row.availableMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  )
}
