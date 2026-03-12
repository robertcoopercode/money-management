import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import { parseCsvFile } from "../lib/csv-preview.js"

type ImportResult = {
  rowsTotal: number
  rowsMatched: number
  rowsCreated: number
  rowsSkipped: number
}

export const useImportMutation = (opts: {
  refetchCoreData: () => void
  onSuccess?: () => void
}) => {
  const uploadCsvMutation = useMutation({
    mutationFn: async (input: {
      file: File
      accountId: string
      mapping: { date: string; amount: string; payee: string; note: string }
    }) => {
      const csvText = await parseCsvFile(input.file)
      return apiFetch<ImportResult>("/api/imports/csv", {
        method: "POST",
        body: JSON.stringify({
          accountId: input.accountId,
          fileName: input.file.name,
          csvText,
          mapping: input.mapping,
        }),
      })
    },
    onSuccess: (result) => {
      toast.success(
        `Imported ${result.rowsTotal} rows (${result.rowsMatched} matched, ${result.rowsCreated} created, ${result.rowsSkipped} skipped).`,
      )
      opts.onSuccess?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
    },
  })

  return { uploadCsvMutation }
}
