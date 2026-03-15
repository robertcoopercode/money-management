import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"

type BulkMutationsOptions = {
  onSuccess?: () => void
}

export const useBulkTransactionMutations = ({ onSuccess }: BulkMutationsOptions = {}) => {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
  }

  const bulkApproveMutation = useMutation({
    mutationFn: (transactionIds: string[]) =>
      apiFetch<{ count: number }>("/api/transactions/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds }),
      }),
    onSuccess: (data) => {
      toast.success(`${data.count} transaction(s) approved.`)
      invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(`Bulk approve failed: ${error.message}`)
    },
  })

  const bulkRejectMutation = useMutation({
    mutationFn: (transactionIds: string[]) =>
      apiFetch<{ count: number }>("/api/transactions/bulk-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds }),
      }),
    onSuccess: (data) => {
      toast.success(`${data.count} transaction(s) rejected and removed.`)
      invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(`Bulk reject failed: ${error.message}`)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (transactionIds: string[]) =>
      apiFetch<{ count: number }>("/api/transactions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds }),
      }),
    onSuccess: (data) => {
      toast.success(`${data.count} transaction(s) deleted.`)
      invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(`Bulk delete failed: ${error.message}`)
    },
  })

  return { bulkApproveMutation, bulkRejectMutation, bulkDeleteMutation }
}
