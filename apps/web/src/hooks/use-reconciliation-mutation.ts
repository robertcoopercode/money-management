import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"

export const useReconciliationMutation = (opts: {
  refetchCoreData: () => void
}) => {
  const reconcileMutation = useMutation({
    mutationFn: ({
      accountId,
      statementBalanceMinor,
    }: {
      accountId: string
      statementBalanceMinor: number
    }) =>
      apiFetch<{ reconciledCount: number; adjustmentTransaction: unknown }>(
        `/api/accounts/${accountId}/reconcile`,
        {
          method: "POST",
          body: JSON.stringify({ statementBalanceMinor }),
        },
      ),
    onSuccess: (data) => {
      toast.success(
        `Reconciled ${data.reconciledCount} transaction${data.reconciledCount === 1 ? "" : "s"}${data.adjustmentTransaction ? " (with adjustment)" : ""}`,
      )
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Reconciliation failed: ${error.message}`)
    },
  })

  return { reconcileMutation }
}
