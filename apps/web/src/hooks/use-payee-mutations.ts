import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import type { Payee } from "../types.js"

export const usePayeeMutations = (opts: {
  refetchCoreData: () => void
  onPayeeCreated?: () => void
  onPayeesMerged?: () => void
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

  return { createPayeeMutation, mergePayeeMutation }
}
