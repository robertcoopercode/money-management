import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "../lib/api.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { computeDateRange, DEFAULT_PRESET } from "../lib/report-presets.js"
import { ReportsToolbar } from "../components/reports-toolbar.js"
import { CategoryReportTable } from "../components/category-report-table.js"
import type { Account, Payee, CategoryGroup } from "../types.js"
import type { CategoryReportResponse } from "@ledgr/shared"

type ReportsTabProps = {
  accounts: Account[]
  payees: Payee[]
  categoryGroups: CategoryGroup[]
}

export const ReportsTab = ({
  accounts,
  payees,
}: ReportsTabProps) => {
  const initialRange = computeDateRange(DEFAULT_PRESET)
  const [filters, setFilters] = useState({
    fromDate: initialRange.fromDate,
    toDate: initialRange.toDate,
    accountId: "",
    payeeId: "",
    clearingStatus: "",
  })

  const reportQuery = useQuery({
    queryKey: ["reports", "categories", filters],
    queryFn: () => {
      const query = new URLSearchParams({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      })

      if (filters.accountId) query.set("accountIds", filters.accountId)
      if (filters.payeeId) query.set("payeeIds", filters.payeeId)
      if (filters.clearingStatus) query.set("clearingStatus", filters.clearingStatus)

      return apiFetch<CategoryReportResponse>(
        `/api/reports/categories?${query.toString()}`,
      )
    },
  })

  return (
    <div className="report-view">
      <ReportsToolbar
        accounts={accounts}
        payees={payees}
        onFiltersChange={setFilters}
      />

      {reportQuery.isError ? (
        <p className="error-text">
          {toDisplayErrorMessage(
            reportQuery.error,
            "Failed to load reporting data.",
          )}
        </p>
      ) : null}

      {reportQuery.isLoading ? (
        <div className="report-loading">
          <div className="report-loading-bar" />
        </div>
      ) : reportQuery.data ? (
        <CategoryReportTable data={reportQuery.data} />
      ) : null}
    </div>
  )
}
