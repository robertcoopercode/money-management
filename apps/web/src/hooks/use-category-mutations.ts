import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import type { Category, CategoryGroup } from "../types.js"

type UpdateCategoryInput = {
  categoryId: string
  name?: string
  groupId?: string
}

type UpdateCategoryGroupInput = {
  groupId: string
  name: string
}

export type CategoryDeleteImpact = {
  transactions: number
  splits: number
  assignments: number
  payeeDefaults: number
}

export type CategoryGroupDeleteImpact = {
  categories: number
  transactions: number
  splits: number
  assignments: number
  payeeDefaults: number
}

export const useCategoryMutations = (opts: {
  refetchCoreData: () => void
  onCategoryUpdated?: () => void
  onCategoryDeleted?: () => void
  onGroupUpdated?: () => void
  onGroupDeleted?: () => void
}) => {
  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, ...body }: UpdateCategoryInput) =>
      apiFetch<Category>(`/api/categories/${categoryId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Category updated")
      opts.onCategoryUpdated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update category: ${error.message}`)
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) =>
      apiFetch<{ ok: boolean }>(`/api/categories/${categoryId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Category deleted")
      opts.onCategoryDeleted?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete category: ${error.message}`)
    },
  })

  const updateCategoryGroupMutation = useMutation({
    mutationFn: ({ groupId, ...body }: UpdateCategoryGroupInput) =>
      apiFetch<CategoryGroup>(`/api/category-groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Category group updated")
      opts.onGroupUpdated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update group: ${error.message}`)
    },
  })

  const deleteCategoryGroupMutation = useMutation({
    mutationFn: (groupId: string) =>
      apiFetch<{ ok: boolean }>(`/api/category-groups/${groupId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Category group deleted")
      opts.onGroupDeleted?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete group: ${error.message}`)
    },
  })

  return {
    updateCategoryMutation,
    deleteCategoryMutation,
    updateCategoryGroupMutation,
    deleteCategoryGroupMutation,
  }
}
