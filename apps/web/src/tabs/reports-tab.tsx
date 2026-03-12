import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ParentSize } from "@visx/responsive"
import {
  AnimatedAxis,
  AnimatedGrid,
  BarSeries,
  Tooltip,
  XYChart,
} from "@visx/xychart"
import { formatMoney } from "@ledgr/shared"
import { apiFetch } from "../lib/api.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { DatePicker } from "../components/date-picker.js"
import type { Account, Payee, CategoryGroup, ReportingResponse } from "../types.js"

type ReportsTabProps = {
  accounts: Account[]
  payees: Payee[]
  categoryGroups: CategoryGroup[]
}

export const ReportsTab = ({
  accounts,
  payees,
  categoryGroups,
}: ReportsTabProps) => {
  const [reportRange, setReportRange] = useState({
    fromDate: `${new Date().getUTCFullYear()}-01-01`,
    toDate: `${new Date().getUTCFullYear()}-12-31`,
  })
  const [reportFilters, setReportFilters] = useState({
    accountId: "",
    categoryId: "",
    payeeId: "",
    cleared: "all" as "all" | "cleared" | "uncleared",
  })

  const reportingQuery = useQuery({
    queryKey: ["reports", reportRange, reportFilters],
    queryFn: () => {
      const query = new URLSearchParams({
        fromDate: reportRange.fromDate,
        toDate: reportRange.toDate,
      })

      if (reportFilters.accountId) {
        query.set("accountIds", reportFilters.accountId)
      }

      if (reportFilters.categoryId) {
        query.set("categoryIds", reportFilters.categoryId)
      }

      if (reportFilters.payeeId) {
        query.set("payeeIds", reportFilters.payeeId)
      }

      if (reportFilters.cleared !== "all") {
        query.set(
          "cleared",
          reportFilters.cleared === "cleared" ? "true" : "false",
        )
      }

      return apiFetch<ReportingResponse>(`/api/reports?${query.toString()}`)
    },
  })

  const spendingChartData = useMemo(
    () =>
      reportingQuery.data?.incomeExpenseByMonth.map((item) => ({
        month: item.month,
        expense: Number((item.expenseMinor / 100).toFixed(2)),
      })) ?? [],
    [reportingQuery.data],
  )

  const accountBalanceTrendChartData = useMemo(
    () =>
      reportingQuery.data?.accountBalanceTrend.map((item) => ({
        month: item.month,
        balance: Number((item.balanceMinor / 100).toFixed(2)),
      })) ?? [],
    [reportingQuery.data],
  )

  return (
    <section className="card">
      <h2>Reporting</h2>
      {reportingQuery.isError ? (
        <p className="error-text">
          {toDisplayErrorMessage(
            reportingQuery.error,
            "Failed to load reporting data.",
          )}
        </p>
      ) : null}
      <div className="inline-controls">
        <label>
          From
          <DatePicker
            value={reportRange.fromDate}
            onChange={(fromDate) =>
              setReportRange((current) => ({
                ...current,
                fromDate,
              }))
            }
          />
        </label>
        <label>
          To
          <DatePicker
            value={reportRange.toDate}
            onChange={(toDate) =>
              setReportRange((current) => ({
                ...current,
                toDate,
              }))
            }
          />
        </label>
        <label>
          Account
          <select
            value={reportFilters.accountId}
            onChange={(event) =>
              setReportFilters((current) => ({
                ...current,
                accountId: event.target.value,
              }))
            }
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={reportFilters.categoryId}
            onChange={(event) =>
              setReportFilters((current) => ({
                ...current,
                categoryId: event.target.value,
              }))
            }
          >
            <option value="">All categories</option>
            {categoryGroups.flatMap((group) =>
              group.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {group.name} · {category.name}
                </option>
              )),
            )}
          </select>
        </label>
        <label>
          Payee
          <select
            value={reportFilters.payeeId}
            onChange={(event) =>
              setReportFilters((current) => ({
                ...current,
                payeeId: event.target.value,
              }))
            }
          >
            <option value="">All payees</option>
            {payees.map((payee) => (
              <option key={payee.id} value={payee.id}>
                {payee.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cleared Status
          <select
            value={reportFilters.cleared}
            onChange={(event) =>
              setReportFilters((current) => ({
                ...current,
                cleared: event.target
                  .value as "all" | "cleared" | "uncleared",
              }))
            }
          >
            <option value="all">All</option>
            <option value="cleared">Cleared only</option>
            <option value="uncleared">Uncleared only</option>
          </select>
        </label>
      </div>

      <div className="chart-card">
        {reportingQuery.isLoading ? (
          <p className="muted">Loading chart data...</p>
        ) : spendingChartData.length === 0 ? (
          <p className="muted">No reporting data for selected filters.</p>
        ) : (
          <ParentSize>
            {({ width }) => (
              <XYChart
                height={320}
                width={width}
                xScale={{ type: "band" }}
                yScale={{ type: "linear", nice: true }}
              >
                <AnimatedAxis orientation="bottom" />
                <AnimatedAxis orientation="left" />
                <AnimatedGrid columns={false} numTicks={4} />
                <BarSeries
                  dataKey="Spending"
                  data={spendingChartData}
                  xAccessor={(d) => d.month}
                  yAccessor={(d) => d.expense}
                />
                <Tooltip
                  renderTooltip={({ tooltipData }) => {
                    const datum = tooltipData?.nearestDatum?.datum as
                      | {
                          month: string
                          expense: number
                        }
                      | undefined

                    if (!datum) {
                      return null
                    }

                    return (
                      <div className="tooltip">
                        <strong>{datum.month}</strong>
                        <div>
                          {formatMoney(Math.round(datum.expense * 100))}
                        </div>
                      </div>
                    )
                  }}
                />
              </XYChart>
            )}
          </ParentSize>
        )}
      </div>

      <div className="chart-card">
        {reportingQuery.isLoading ? (
          <p className="muted">Loading account balance trend...</p>
        ) : accountBalanceTrendChartData.length === 0 ? (
          <p className="muted">
            No account balance trend for selected filters.
          </p>
        ) : (
          <ParentSize>
            {({ width }) => (
              <XYChart
                height={320}
                width={width}
                xScale={{ type: "band" }}
                yScale={{ type: "linear", nice: true }}
              >
                <AnimatedAxis orientation="bottom" />
                <AnimatedAxis orientation="left" />
                <AnimatedGrid columns={false} numTicks={4} />
                <BarSeries
                  dataKey="Account Balance"
                  data={accountBalanceTrendChartData}
                  xAccessor={(d) => d.month}
                  yAccessor={(d) => d.balance}
                />
                <Tooltip
                  renderTooltip={({ tooltipData }) => {
                    const datum = tooltipData?.nearestDatum?.datum as
                      | {
                          month: string
                          balance: number
                        }
                      | undefined

                    if (!datum) {
                      return null
                    }

                    return (
                      <div className="tooltip">
                        <strong>{datum.month}</strong>
                        <div>
                          {formatMoney(Math.round(datum.balance * 100))}
                        </div>
                      </div>
                    )
                  }}
                />
              </XYChart>
            )}
          </ParentSize>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expense</th>
            </tr>
          </thead>
          <tbody>
            {reportingQuery.isLoading ? (
              <tr>
                <td colSpan={3} className="muted">
                  Loading report table...
                </td>
              </tr>
            ) : (reportingQuery.data?.incomeExpenseByMonth.length ?? 0) ===
              0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No monthly data for selected filters.
                </td>
              </tr>
            ) : (
              (reportingQuery.data?.incomeExpenseByMonth ?? []).map(
                (item) => (
                  <tr key={item.month}>
                    <td>{item.month}</td>
                    <td className="amount-inflow">
                      {formatMoney(item.incomeMinor)}
                    </td>
                    <td className="amount-outflow">
                      {formatMoney(-item.expenseMinor)}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Category</th>
              <th>Total Spending</th>
            </tr>
          </thead>
          <tbody>
            {reportingQuery.isLoading ? (
              <tr>
                <td colSpan={3} className="muted">
                  Loading spending breakdown...
                </td>
              </tr>
            ) : (reportingQuery.data?.spendingByCategory.length ?? 0) ===
              0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No category spending breakdown for selected filters.
                </td>
              </tr>
            ) : (
              (reportingQuery.data?.spendingByCategory ?? []).map((item) => (
                <tr key={item.categoryId}>
                  <td>{item.groupName}</td>
                  <td>{item.categoryName}</td>
                  <td className="amount-outflow">
                    {formatMoney(-item.totalMinor)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
