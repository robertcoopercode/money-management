import { useState } from "react"
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

  const { uploadCsvMutation } = useImportMutation({
    refetchCoreData,
    onSuccess: () => {
      setSelectedCsvFile(null)
      setCsvPreview(null)
    },
  })

  return (
    <section className="card">
      <h2>CSV Import</h2>
      <p className="muted">
        CSV columns expected by default:{" "}
        <code>date,amount,payee,note</code>. Matching uses exact amount and
        ±3 day date window.
      </p>
      <div className="transaction-form">
        <input
          value={importMapping.date}
          onChange={(event) =>
            setImportMapping((current) => ({
              ...current,
              date: event.target.value,
            }))
          }
          placeholder="Date column"
        />
        <input
          value={importMapping.amount}
          onChange={(event) =>
            setImportMapping((current) => ({
              ...current,
              amount: event.target.value,
            }))
          }
          placeholder="Amount column"
        />
        <input
          value={importMapping.payee}
          onChange={(event) =>
            setImportMapping((current) => ({
              ...current,
              payee: event.target.value,
            }))
          }
          placeholder="Payee column"
        />
        <input
          value={importMapping.note}
          onChange={(event) =>
            setImportMapping((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
          placeholder="Note column"
        />
      </div>
      <div className="transaction-form">
        <AccountCombobox
          accounts={accounts}
          value={accountId}
          onChange={onAccountIdChange}
          placeholder="Select account"
        />
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            setSelectedCsvFile(file)

            if (!file) {
              setCsvPreview(null)
              return
            }

            void parseCsvFile(file).then((csvText) => {
              setCsvPreview(buildCsvPreview(csvText))
            })
          }}
        />
        <button
          type="button"
          disabled={!selectedCsvFile || uploadCsvMutation.isPending}
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
          Import CSV
        </button>
      </div>

      {csvPreview ? (
        <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
          <table>
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
      ) : (
        <p className="muted" style={{ marginTop: "0.8rem" }}>
          Select a CSV file to preview first five rows before import.
        </p>
      )}
    </section>
  )
}
