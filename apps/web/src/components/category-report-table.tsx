import { useState, useMemo } from "react"
import { formatMoney } from "@ledgr/shared"
import { format } from "date-fns"
import type { CategoryReportResponse } from "@ledgr/shared"

function formatMonthHeader(monthKey: string): { month: string; year: string } {
  const [year, month] = monthKey.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return {
    month: format(date, "MMM"),
    year: format(date, "yyyy"),
  }
}

function AmountCell({
  amount,
  className,
}: {
  amount: number | undefined
  className?: string
}) {
  if (!amount || amount === 0)
    return <td className={`rt-amount ${className ?? ""}`}>–</td>
  const cls = amount < 0 ? "rt-neg" : "rt-pos"
  return (
    <td className={`rt-amount ${cls} ${className ?? ""}`}>
      {formatMoney(amount)}
    </td>
  )
}

type CategoryReportTableProps = {
  data: CategoryReportResponse
}

export function CategoryReportTable({ data }: CategoryReportTableProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const { months, groups } = data

  const toggleGroup = (groupKey: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const groupAggregates = useMemo(
    () =>
      groups.map((group) => {
        const monthlyTotals: Record<string, number> = {}
        let total = 0
        let count = 0
        for (const cat of group.categories) {
          total += cat.totalMinor
          count += cat.count
          for (const m of months) {
            monthlyTotals[m] =
              (monthlyTotals[m] ?? 0) + (cat.monthlyAmounts[m] ?? 0)
          }
        }
        return { monthlyTotals, total, count }
      }),
    [groups, months],
  )

  const { grandMonthly, grandTotal, grandCount } = useMemo(() => {
    const gm: Record<string, number> = {}
    let gt = 0
    let gc = 0
    for (const agg of groupAggregates) {
      gt += agg.total
      gc += agg.count
      for (const m of months) {
        gm[m] = (gm[m] ?? 0) + (agg.monthlyTotals[m] ?? 0)
      }
    }
    return { grandMonthly: gm, grandTotal: gt, grandCount: gc }
  }, [groupAggregates, months])

  const monthCount = months.length || 1
  const colCount = months.length + 4

  return (
    <div className="report-scroll-wrap">
      <table className="rt">
        <thead>
          <tr>
            <th className="rt-pin">Category</th>
            {months.map((m) => {
              const h = formatMonthHeader(m)
              return (
                <th key={m} className="rt-amount">
                  <span className="rt-month-label">{h.month}</span>
                  <span className="rt-year-label">{h.year}</span>
                </th>
              )
            })}
            <th className="rt-amount rt-summary-col">Total</th>
            <th className="rt-amount rt-summary-col">Average</th>
            <th className="rt-amount rt-summary-col rt-count-col">Count</th>
          </tr>
        </thead>

        {groups.map((group, gi) => {
          const groupKey = group.groupId ?? group.groupName
          const isCollapsed = collapsed.has(groupKey)
          const agg = groupAggregates[gi]!

          return (
            <tbody key={groupKey} className="rt-group-body">
              <tr
                className="rt-group-row"
                onClick={() => toggleGroup(groupKey)}
              >
                <td className="rt-pin rt-group-name">
                  <span
                    className="rt-chevron"
                    data-open={!isCollapsed || undefined}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M3 1.5 L7 5 L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {group.groupName}
                  <span className="rt-group-count">
                    {group.categories.length}
                  </span>
                </td>
                {months.map((m) => (
                  <AmountCell key={m} amount={agg.monthlyTotals[m]} />
                ))}
                <AmountCell amount={agg.total} className="rt-summary-col" />
                <AmountCell
                  amount={Math.round(agg.total / monthCount)}
                  className="rt-summary-col"
                />
                <td className="rt-amount rt-summary-col rt-count-col">
                  {agg.count}
                </td>
              </tr>

              {!isCollapsed &&
                group.categories.map((cat) => (
                  <tr key={cat.categoryId} className="rt-cat-row">
                    <td className="rt-pin rt-cat-name">{cat.categoryName}</td>
                    {months.map((m) => (
                      <AmountCell key={m} amount={cat.monthlyAmounts[m]} />
                    ))}
                    <AmountCell
                      amount={cat.totalMinor}
                      className="rt-summary-col"
                    />
                    <AmountCell
                      amount={Math.round(cat.totalMinor / monthCount)}
                      className="rt-summary-col"
                    />
                    <td className="rt-amount rt-summary-col rt-count-col">
                      {cat.count}
                    </td>
                  </tr>
                ))}
            </tbody>
          )
        })}

        <tfoot>
          <tr className="rt-grand-row">
            <td className="rt-pin" colSpan={1}>
              Total
            </td>
            {months.map((m) => (
              <AmountCell key={m} amount={grandMonthly[m]} />
            ))}
            <AmountCell amount={grandTotal} className="rt-summary-col" />
            <AmountCell
              amount={Math.round(grandTotal / monthCount)}
              className="rt-summary-col"
            />
            <td className="rt-amount rt-summary-col rt-count-col">
              {grandCount}
            </td>
          </tr>
        </tfoot>

        {groups.length === 0 && (
          <tbody>
            <tr>
              <td colSpan={colCount} className="rt-empty">
                No category data for the selected filters.
              </td>
            </tr>
          </tbody>
        )}
      </table>
    </div>
  )
}
