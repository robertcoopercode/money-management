import { useEffect } from "react"
import { AppSelect } from "./app-select.js"
import { DatePicker } from "./date-picker.js"
import {
  REPORT_PRESETS,
  DEFAULT_PRESET,
  computeDateRange,
  formatRangeLabel,
  type ReportPreset,
} from "../lib/report-presets.js"
import { useLocalStorage } from "../hooks/use-local-storage.js"
import type { Account, Payee } from "../types.js"

type ReportsToolbarProps = {
  accounts: Account[]
  payees: Payee[]
  onFiltersChange: (filters: {
    fromDate: string
    toDate: string
    accountId: string
    payeeId: string
    clearingStatus: string
  }) => void
}

export function ReportsToolbar({
  accounts,
  payees,
  onFiltersChange,
}: ReportsToolbarProps) {
  const [preset, setPreset] = useLocalStorage<ReportPreset>("ledgr:report-preset", DEFAULT_PRESET)
  const [customFrom, setCustomFrom] = useLocalStorage("ledgr:report-custom-from", "")
  const [customTo, setCustomTo] = useLocalStorage("ledgr:report-custom-to", "")
  const [accountId, setAccountId] = useLocalStorage("ledgr:report-account", "")
  const [payeeId, setPayeeId] = useLocalStorage("ledgr:report-payee", "")
  const [clearingStatus, setClearingStatus] = useLocalStorage("ledgr:report-status", "")

  const range = computeDateRange(preset, customFrom || undefined, customTo || undefined)

  const fireChange = (overrides?: Partial<typeof range & { accountId: string; payeeId: string; clearingStatus: string }>) => {
    const r = overrides?.fromDate ? { fromDate: overrides.fromDate, toDate: overrides.toDate! } : range
    onFiltersChange({
      fromDate: r.fromDate,
      toDate: r.toDate,
      accountId: overrides?.accountId ?? accountId,
      payeeId: overrides?.payeeId ?? payeeId,
      clearingStatus: overrides?.clearingStatus ?? clearingStatus,
    })
  }

  useEffect(() => {
    fireChange()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync persisted state to parent on mount only
  }, [])

  const handlePresetChange = (value: string) => {
    const p = value as ReportPreset
    setPreset(p)
    if (p !== "custom") {
      const r = computeDateRange(p)
      fireChange({ fromDate: r.fromDate, toDate: r.toDate })
    }
  }

  return (
    <div className="report-toolbar">
      <div className="report-toolbar-primary">
        <label>
          Range
          <AppSelect
            options={REPORT_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
            value={preset}
            onChange={handlePresetChange}
          />
        </label>
        {preset === "custom" ? (
          <>
            <label>
              From
              <DatePicker
                value={customFrom}
                onChange={(v) => { setCustomFrom(v); if (v && customTo) fireChange({ fromDate: v, toDate: customTo }) }}
              />
            </label>
            <label>
              To
              <DatePicker
                value={customTo}
                onChange={(v) => { setCustomTo(v); if (customFrom && v) fireChange({ fromDate: customFrom, toDate: v }) }}
              />
            </label>
          </>
        ) : (
          <span className="report-date-badge">
            {formatRangeLabel(range.fromDate, range.toDate)}
          </span>
        )}
      </div>
      <div className="report-toolbar-filters">
        <label>
          Account
          <AppSelect
            options={[
              { value: "", label: "All accounts" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            value={accountId}
            onChange={(v) => { setAccountId(v); fireChange({ accountId: v }) }}
            placeholder="Select..."
          />
        </label>
        <label>
          Payee
          <AppSelect
            options={[
              { value: "", label: "All payees" },
              ...payees.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={payeeId}
            onChange={(v) => { setPayeeId(v); fireChange({ payeeId: v }) }}
            placeholder="Select..."
          />
        </label>
        <label>
          Status
          <AppSelect
            options={[
              { value: "", label: "All" },
              { value: "CLEARED", label: "Cleared" },
              { value: "UNCLEARED", label: "Uncleared" },
              { value: "RECONCILED", label: "Reconciled" },
            ]}
            value={clearingStatus}
            onChange={(v) => { setClearingStatus(v); fireChange({ clearingStatus: v }) }}
            placeholder="Select..."
          />
        </label>
      </div>
    </div>
  )
}
