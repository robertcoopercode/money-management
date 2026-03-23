import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import type { Category, CategoryGroup } from "../types.js"

type UpdateCategoryInput = {
  categoryId: string
  name?: string
  groupId?: string
  isIncomeCategory?: boolean
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
}

export const useCategoryMutations = (opts: {
  refetchCoreData: () => void
  onCategoryUpdated?: () => void
  onCategoryDeleted?: () => void
  onGroupUpdated?: () => void
  onGroupDeleted?: () => void
  onGroupCreated?: () => void
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

  const createCategoryGroupMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<CategoryGroup>("/api/category-groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      toast.success("Category group created")
      opts.onGroupCreated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to create group: ${error.message}`)
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (input: { name: string; groupName?: string }) =>
      apiFetch<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Category created")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to create category: ${error.message}`)
    },
  })

  // Reorder mutations are fire-and-forget — client ordering is authoritative.
  // No cache invalidation or refetch on settle; just toast on error.
  const reorderCategoryMutation = useMutation({
    mutationFn: (input: { categoryId: string; sortOrder: string; groupId?: string | null }) =>
      apiFetch(`/api/categories/${input.categoryId}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ sortOrder: input.sortOrder, groupId: input.groupId }),
      }),
    onError: (error) => {
      toast.error(`Unable to reorder category: ${error.message}`)
    },
  })

  const reorderCategoryGroupMutation = useMutation({
    mutationFn: (input: { groupId: string; sortOrder: string }) =>
      apiFetch(`/api/category-groups/${input.groupId}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ sortOrder: input.sortOrder }),
      }),
    onError: (error) => {
      toast.error(`Unable to reorder group: ${error.message}`)
    },
  })

  return {
    updateCategoryMutation,
    deleteCategoryMutation,
    updateCategoryGroupMutation,
    deleteCategoryGroupMutation,
    createCategoryGroupMutation,
    createCategoryMutation,
    reorderCategoryMutation,
    reorderCategoryGroupMutation,
  }
}
