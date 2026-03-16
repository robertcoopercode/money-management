import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import type { Payee } from "../types.js"

export const usePayeeMutations = (opts: {
  refetchCoreData: () => void
  onPayeeCreated?: () => void
  onPayeesMerged?: () => void
  onPayeesCombined?: () => void
  onPayeesDeleted?: () => void
}) => {
  const createPayeeMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<Payee>("/api/payees", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      toast.success("Payee created")
      opts.onPayeeCreated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to add payee: ${error.message}`)
    },
  })

  const mergePayeeMutation = useMutation({
    mutationFn: (input: { sourcePayeeId: string; targetPayeeId: string }) =>
      apiFetch<Payee>("/api/payees/merge", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Payees merged")
      opts.onPayeesMerged?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to merge payees: ${error.message}`)
    },
  })

  const combinePayeeMutation = useMutation({
    mutationFn: (input: { payeeIds: string[]; newName: string }) =>
      apiFetch<Payee>("/api/payees/combine", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Payees combined")
      opts.onPayeesCombined?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to combine payees: ${error.message}`)
    },
  })

  const deletePayeeMutation = useMutation({
    mutationFn: (payeeIds: string[]) =>
      apiFetch<{ count: number }>("/api/payees/delete", {
        method: "POST",
        body: JSON.stringify({ payeeIds }),
      }),
    onSuccess: (_data, payeeIds) => {
      toast.success(
        payeeIds.length === 1 ? "Payee deleted" : `${payeeIds.length} payees deleted`,
      )
      opts.onPayeesDeleted?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete payees: ${error.message}`)
    },
  })

  const updatePayeeMutation = useMutation({
    mutationFn: (input: { payeeId: string; name?: string; defaultCategoryId?: string | null }) =>
      apiFetch<Payee>(`/api/payees/${input.payeeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(input.name != null ? { name: input.name } : {}),
          ...(input.defaultCategoryId !== undefined ? { defaultCategoryId: input.defaultCategoryId } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("Payee updated")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update payee: ${error.message}`)
    },
  })

  return { createPayeeMutation, mergePayeeMutation, combinePayeeMutation, deletePayeeMutation, updatePayeeMutation }
}
