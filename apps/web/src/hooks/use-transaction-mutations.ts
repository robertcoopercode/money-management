import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import type {
  Transaction,
  Payee,
  Category,
  UpdateTransactionMutationInput,
} from "../types.js"

export const useTransactionMutations = (opts: {
  refetchCoreData: () => void
  onTransactionCreated?: () => void
  onTransactionUpdated?: () => void
}) => {
  const queryClient = useQueryClient()

  const createTransactionMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Transaction saved")
      opts.onTransactionCreated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to create transaction: ${error.message}`)
    },
  })

  const updateTransactionMutation = useMutation({
    mutationFn: ({ transactionId, patch }: UpdateTransactionMutationInput) =>
      apiFetch<Transaction>(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      toast.success("Transaction updated")
      opts.onTransactionUpdated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update transaction: ${error.message}`)
    },
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (transactionId: string) =>
      apiFetch<void>(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Transaction deleted")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete transaction: ${error.message}`)
    },
  })

  const createTransactionPayeeMutation = useMutation({
    mutationFn: (input: { name: string }) =>
      apiFetch<Payee>("/api/payees", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Payee created")
      void queryClient.invalidateQueries({ queryKey: ["payees"] })
      void queryClient.invalidateQueries({ queryKey: ["reports"] })
    },
    onError: (error) => {
      toast.error(`Unable to add payee: ${error.message}`)
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (input: { name: string }) =>
      apiFetch<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Category created")
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      void queryClient.invalidateQueries({ queryKey: ["planning"] })
    },
    onError: (error) => {
      toast.error(`Unable to create category: ${error.message}`)
    },
  })

  return {
    createTransactionMutation,
    updateTransactionMutation,
    deleteTransactionMutation,
    createTransactionPayeeMutation,
    createCategoryMutation,
  }
}
