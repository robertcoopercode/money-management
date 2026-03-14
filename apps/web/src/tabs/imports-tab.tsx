import { useState, useRef } from "react"
import { AccountCombobox } from "../components/account-combobox.js"
import { buildCsvPreview, parseCsvFile } from "../lib/csv-preview.js"
import { useImportMutation } from "../hooks/use-import-mutation.js"
import type { CsvPreview } from "../lib/csv-preview.js"
import type { Account } from "../types.js"

type ImportsTabProps = {
  accountId: string
  onAccountIdChange: (accountId: string) => void
  accounts: Account[]
  refetchCoreData: () => void
}

export const ImportsTab = ({
  accountId,
  onAccountIdChange,
  accounts,
  refetchCoreData,
}: ImportsTabProps) => {
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const [importMapping, setImportMapping] = useState({
    date: "date",
    amount: "amount",
    payee: "payee",
    note: "note",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploadCsvMutation } = useImportMutation({
    refetchCoreData,
    onSuccess: () => {
      setSelectedCsvFile(null)
      setCsvPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
  })

  const handleFileSelect = (file: File | null) => {
    setSelectedCsvFile(file)
    if (!file) {
      setCsvPreview(null)
      return
    }
    void parseCsvFile(file).then((csvText) => {
      setCsvPreview(buildCsvPreview(csvText))
    })
  }

  return (
    <div className="import-layout">
      {/* Settings card */}
      <section className="card">
        <h2>CSV Import</h2>

        <div className="import-section">
          <div className="import-section-label">Column Mapping</div>
          <p className="muted" style={{ marginTop: 0, marginBottom: "0.6rem" }}>
            Map your CSV headers to the expected fields. Duplicate detection uses
            exact amount and ±3 day date window.
          </p>
          <div className="import-mapping-grid">
            {(["date", "amount", "payee", "note"] as const).map((field) => (
              <label key={field} className="import-field-label">
                <span className="import-field-name">{field}</span>
                <input
                  value={importMapping[field]}
                  onChange={(event) =>
                    setImportMapping((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  placeholder={`${field} column`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="import-divider" />

        <div className="import-section">
          <div className="import-section-label">File &amp; Account</div>
          <div className="import-file-row">
            <div className="import-field-label" style={{ flex: 1 }}>
              <span className="import-field-name">Account</span>
              <AccountCombobox
                accounts={accounts}
                value={accountId}
                onChange={onAccountIdChange}
                placeholder="Select account"
              />
            </div>
            <div className="import-field-label" style={{ flex: 1 }}>
              <span className="import-field-name">CSV File</span>
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
                className="import-drop-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {selectedCsvFile ? (
                  <span className="import-file-name">
                    {selectedCsvFile.name}
                  </span>
                ) : (
                  <span>Choose a .csv file</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="import-actions">
          <button
            type="button"
            className="button-success"
            disabled={
              !selectedCsvFile || !accountId || uploadCsvMutation.isPending
            }
            onClick={() => {
              if (selectedCsvFile) {
                uploadCsvMutation.mutate({
                  file: selectedCsvFile,
                  accountId,
                  mapping: importMapping,
                })
              }
            }}
          >
            {uploadCsvMutation.isPending ? "Importing…" : "Import CSV"}
          </button>
        </div>

        {uploadCsvMutation.isError && (
          <p className="error-text">
            {uploadCsvMutation.error?.message ?? "Import failed"}
          </p>
        )}
      </section>

      {/* Preview card */}
      {csvPreview ? (
        <section className="card import-preview-card">
          <div className="section-header">
            <h2 style={{ marginBottom: 0 }}>Preview</h2>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              First {csvPreview.rows.length} rows of{" "}
              <strong>{selectedCsvFile?.name}</strong>
            </span>
          </div>
          <div className="table-wrap import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  {csvPreview.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.rows.map((row, index) => (
                  <tr key={`${index}-${row.join("-")}`}>
                    {csvPreview.headers.map((_, headerIndex) => (
                      <td key={`${index}-${headerIndex}`}>
                        {row[headerIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="import-empty-state">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p>Select a CSV file to preview rows before importing.</p>
        </div>
      )}
    </div>
  )
}
