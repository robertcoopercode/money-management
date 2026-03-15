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
  onSuccess?: (result: ImportResult) => void
}) => {
  const uploadCsvMutation = useMutation({
    mutationFn: async (input: {
      file: File
      accountId: string
      mapping: { date: string; amount: string; payee: string; note?: string }
      swapInflowOutflow?: boolean
    }) => {
      const csvText = await parseCsvFile(input.file)
      return apiFetch<ImportResult>("/api/imports/csv", {
        method: "POST",
        body: JSON.stringify({
          accountId: input.accountId,
          fileName: input.file.name,
          csvText,
          mapping: {
            date: input.mapping.date,
            amount: input.mapping.amount,
            payee: input.mapping.payee,
            ...(input.mapping.note ? { note: input.mapping.note } : {}),
          },
          swapInflowOutflow: input.swapInflowOutflow ?? false,
        }),
      })
    },
    onSuccess: (result) => {
      toast.success(
        `Imported ${result.rowsTotal} rows (${result.rowsMatched} matched, ${result.rowsCreated} created, ${result.rowsSkipped} skipped).`,
      )
      opts.onSuccess?.(result)
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
    },
  })

  return { uploadCsvMutation }
}
