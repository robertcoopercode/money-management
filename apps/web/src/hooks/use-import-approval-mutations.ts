import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"

export const useImportApprovalMutations = () => {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
  }

  const approveMutation = useMutation({
    mutationFn: (transactionId: string) =>
      apiFetch(`/api/transactions/${transactionId}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Transaction approved.")
      invalidate()
    },
    onError: (error) => {
      toast.error(`Approve failed: ${error.message}`)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (transactionId: string) =>
      apiFetch(`/api/transactions/${transactionId}/reject`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Transaction rejected and removed.")
      invalidate()
    },
    onError: (error) => {
      toast.error(`Reject failed: ${error.message}`)
    },
  })

  const unmatchMutation = useMutation({
    mutationFn: (transactionId: string) =>
      apiFetch(`/api/transactions/${transactionId}/unmatch`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Transaction unmatched. A new import transaction was created.")
      invalidate()
    },
    onError: (error) => {
      toast.error(`Unmatch failed: ${error.message}`)
    },
  })

  return { approveMutation, rejectMutation, unmatchMutation }
}
