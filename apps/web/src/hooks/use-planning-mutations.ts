import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import type { AssignmentMutationInput } from "../types.js"

export type MoveBudgetInput = {
  fromCategoryId: string
  toCategoryId: string
  amountMinor: number
}

export const usePlanningMutations = (opts: {
  month: string
  refetchCoreData: () => void
}) => {
  const assignMutation = useMutation({
    mutationFn: (input: AssignmentMutationInput) =>
      apiFetch("/api/planning/assignments", {
        method: "POST",
        body: JSON.stringify({
          month: opts.month,
          categoryId: input.categoryId,
          assignedMinor: input.assignedMinor,
        }),
      }),
    onSuccess: () => {
      toast.success("Category assignment updated")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update assignment: ${error.message}`)
    },
  })

  const autoCoverMutation = useMutation({
    mutationFn: (inputs: AssignmentMutationInput[]) =>
      apiFetch("/api/planning/assignments/bulk", {
        method: "POST",
        body: JSON.stringify({
          assignments: inputs.map((input) => ({
            month: opts.month,
            categoryId: input.categoryId,
            assignedMinor: input.assignedMinor,
          })),
        }),
      }),
    onSuccess: () => {
      toast.success("Underfunded categories covered")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to auto-cover: ${error.message}`)
    },
  })

  const moveBudgetMutation = useMutation({
    mutationFn: (input: MoveBudgetInput) =>
      apiFetch("/api/planning/move", {
        method: "POST",
        body: JSON.stringify({
          month: opts.month,
          fromCategoryId: input.fromCategoryId,
          toCategoryId: input.toCategoryId,
          amountMinor: input.amountMinor,
        }),
      }),
    onSuccess: () => {
      toast.success("Budget moved")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to move budget: ${error.message}`)
    },
  })

  return { assignMutation, autoCoverMutation, moveBudgetMutation }
}
