import { useState, useRef, useMemo } from "react"
import { formatMoney } from "@ledgr/shared"
import { Select } from "@base-ui/react/select"
import { ScrollArea } from "./scroll-area.js"
import { AppCheckbox } from "./app-checkbox.js"
import { AppDialog } from "./app-dialog.js"
import { buildCsvPreview, guessColumnMapping, parseCsvFile } from "../lib/csv-preview.js"
import { useImportMutation } from "../hooks/use-import-mutation.js"
import type { CsvPreview } from "../lib/csv-preview.js"

type CsvImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  refetchCoreData: () => void
}

type ParsedRow = {
  date: string
  payee: string
  memo: string
  amountMinor: number
}

const parseAmountMinor = (raw: string): number | null => {
  const cleaned = raw.replace(/[$,\s]/gu, "")
  if (!cleaned.length) return null
  const num = Number(cleaned)
  if (Number.isNaN(num)) return null
  return Math.round(num * 100)
}

const parsePreviewRows = (
  preview: CsvPreview,
  mapping: { date: string; amount: string; payee: string; note: string },
): ParsedRow[] => {
  const dateIdx = preview.headers.indexOf(mapping.date)
  const amountIdx = preview.headers.indexOf(mapping.amount)
  const payeeIdx = preview.headers.indexOf(mapping.payee)
  const noteIdx = preview.headers.indexOf(mapping.note)

  return preview.rows
    .map((row) => {
      const rawAmount = amountIdx >= 0 ? (row[amountIdx] ?? "") : ""
      const amountMinor = parseAmountMinor(rawAmount)
      if (amountMinor === null) return null
      return {
        date: dateIdx >= 0 ? (row[dateIdx] ?? "") : "",
        payee: payeeIdx >= 0 ? (row[payeeIdx] ?? "") : "",
        memo: noteIdx >= 0 ? (row[noteIdx] ?? "") : "",
        amountMinor,
      }
    })
    .filter((r): r is ParsedRow => r !== null)
}

export function CsvImportDialog({
  open,
  onOpenChange,
  accountId,
  refetchCoreData,
}: CsvImportDialogProps) {
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const [swapInflowOutflow, setSwapInflowOutflow] = useState(false)
  const [importMapping, setImportMapping] = useState({
    date: "",
    amount: "",
    payee: "",
    note: "",
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastResult, setLastResult] = useState<{
    rowsTotal: number
    rowsMatched: number
    rowsCreated: number
    rowsSkipped: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploadCsvMutation } = useImportMutation({
    refetchCoreData,
    onSuccess: (result) => {
      setLastResult(result)
      setShowSuccess(true)
      setSelectedCsvFile(null)
      setCsvPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
  })

  const handleFileSelect = (file: File | null) => {
    setSelectedCsvFile(file)
    setShowSuccess(false)
    if (!file) {
      setCsvPreview(null)
      return
    }
    void parseCsvFile(file).then((csvText) => {
      const preview = buildCsvPreview(csvText)
      setCsvPreview(preview)
      if (preview) {
        setImportMapping(guessColumnMapping(preview.headers))
      }
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedCsvFile(null)
    setCsvPreview(null)
    setSwapInflowOutflow(false)
    setShowSuccess(false)
    setLastResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const parsedRows = useMemo(() => {
    if (!csvPreview) return []
    return parsePreviewRows(csvPreview, importMapping)
  }, [csvPreview, importMapping])

  const displayRows = useMemo(() => {
    return parsedRows.map((row) => ({
      ...row,
      amountMinor: swapInflowOutflow ? row.amountMinor * -1 : row.amountMinor,
    }))
  }, [parsedRows, swapInflowOutflow])

  if (showSuccess && lastResult) {
    return (
      <AppDialog
        open={open}
        onOpenChange={() => handleClose()}
        title="Import Complete"
      >
        <div className="import-success-stats">
          <div className="import-stat">
            <span className="import-stat-value">{lastResult.rowsTotal}</span>
            <span className="import-stat-label">Total rows</span>
          </div>
          <div className="import-stat">
            <span className="import-stat-value">{lastResult.rowsCreated}</span>
            <span className="import-stat-label">Created</span>
          </div>
          <div className="import-stat">
            <span className="import-stat-value">{lastResult.rowsMatched}</span>
            <span className="import-stat-label">Matched</span>
          </div>
          <div className="import-stat">
            <span className="import-stat-value">{lastResult.rowsSkipped}</span>
            <span className="import-stat-label">Skipped</span>
          </div>
        </div>
        <p className="muted" style={{ margin: "0.75rem 0 0" }}>
          Imported transactions are pending approval. Review them in the transactions list.
        </p>
        <div className="import-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="button-success"
            onClick={handleClose}
          >
            Done
          </button>
        </div>
      </AppDialog>
    )
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={() => handleClose()}
      title="CSV Import"
      wide
    >
      {csvPreview ? (
        <>
          <div className="import-summary">
            <strong>{displayRows.length}</strong> transactions will be imported
            from <strong>{selectedCsvFile?.name}</strong>
          </div>

          <div className="import-section">
            <div className="import-section-label">Column Mapping</div>
            <div className="import-mapping-grid">
              {(["date", "amount", "payee", "note"] as const).map((field) => (
                <div key={field} className="import-field-label">
                  <span className="import-field-name">{field}</span>
                  <Select.Root
                    value={importMapping[field]}
                    onValueChange={(value) =>
                      setImportMapping((current) => ({
                        ...current,
                        [field]: value ?? "",
                      }))
                    }
                  >
                    <Select.Trigger className="account-filter-trigger">
                      <Select.Value
                        placeholder={field === "note" ? "— (none)" : "—"}
                        className="account-filter-value"
                      >
                        {importMapping[field] || null}
                      </Select.Value>
                      <Select.Icon className="account-filter-icon">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner
                        className="account-filter-positioner"
                        sideOffset={6}
                        alignItemWithTrigger={false}
                        side="bottom"
                        align="start"
                      >
                        <Select.Popup className="account-filter-popup">
                          <ScrollArea>
                            <Select.Item value="" className="account-filter-option">
                              <Select.ItemText>
                                {field === "note" ? "— (none)" : "—"}
                              </Select.ItemText>
                            </Select.Item>
                            {csvPreview.headers.map((header) => (
                              <Select.Item
                                key={header}
                                value={header}
                                className="account-filter-option"
                              >
                                <Select.ItemText>{header}</Select.ItemText>
                                <Select.ItemIndicator className="account-filter-check">
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
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </ScrollArea>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                </div>
              ))}
            </div>
          </div>

          <div className="import-section">
            <label className="import-swap-toggle">
              <AppCheckbox
                checked={swapInflowOutflow}
                onCheckedChange={(checked) => setSwapInflowOutflow(checked)}
              />
              <span>Swap inflow/outflow</span>
            </label>
          </div>

          <ScrollArea orientation="both" className="table-wrap import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payee</th>
                  <th>Memo</th>
                  <th className="amount-col">Outflow</th>
                  <th className="amount-col">Inflow</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, index) => (
                  <tr key={index}>
                    <td>{row.date}</td>
                    <td>{row.payee}</td>
                    <td>{row.memo}</td>
                    <td className="amount-col amount-outflow">
                      {row.amountMinor < 0
                        ? formatMoney(Math.abs(row.amountMinor))
                        : ""}
                    </td>
                    <td className="amount-col amount-inflow">
                      {row.amountMinor >= 0
                        ? formatMoney(row.amountMinor)
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          <div className="import-actions">
            <button
              type="button"
              onClick={() => {
                setSelectedCsvFile(null)
                setCsvPreview(null)
                setSwapInflowOutflow(false)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="button-success"
              disabled={
                !selectedCsvFile ||
                !accountId ||
                !importMapping.date ||
                !importMapping.amount ||
                !importMapping.payee ||
                uploadCsvMutation.isPending
              }
              onClick={() => {
                if (selectedCsvFile) {
                  uploadCsvMutation.mutate({
                    file: selectedCsvFile,
                    accountId,
                    mapping: importMapping,
                    swapInflowOutflow,
                  })
                }
              }}
            >
              {uploadCsvMutation.isPending ? "Importing..." : "Import"}
            </button>
          </div>

          {uploadCsvMutation.isError && (
            <p className="error-text">
              {uploadCsvMutation.error?.message ?? "Import failed"}
            </p>
          )}
        </>
      ) : (
        <div className="import-upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="import-file-input"
            onChange={(event) => {
              handleFileSelect(event.target.files?.[0] ?? null)
            }}
          />
          <button
            type="button"
            className="import-drop-zone import-drop-zone-large"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Choose a .csv file to import</span>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Duplicate detection uses exact amount and ±10 day window
            </span>
          </button>
        </div>
      )}
    </AppDialog>
  )
}
