import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import type { Tag } from "../types.js"

type CreateTagInput = {
  name: string
  description?: string
  backgroundColor?: string
  textColor?: string
}

type UpdateTagInput = {
  name?: string
  description?: string
  backgroundColor?: string
  textColor?: string
  isArchived?: boolean
}

export const useTagMutations = (opts: {
  refetchCoreData: () => void
  onTagCreated?: () => void
  onTagUpdated?: () => void
  onTagDeleted?: () => void
}) => {
  const createTagMutation = useMutation({
    mutationFn: (input: CreateTagInput) =>
      apiFetch<Tag>("/api/tags", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Tag created")
      opts.onTagCreated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to create tag: ${error.message}`)
    },
  })

  const updateTagMutation = useMutation({
    mutationFn: (input: { tagId: string } & UpdateTagInput) => {
      const { tagId, ...body } = input
      return apiFetch<Tag>(`/api/tags/${tagId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success("Tag updated")
      opts.onTagUpdated?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update tag: ${error.message}`)
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: (tagId: string) =>
      apiFetch<void>(`/api/tags/${tagId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Tag deleted")
      opts.onTagDeleted?.()
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete tag: ${error.message}`)
    },
  })

  return { createTagMutation, updateTagMutation, deleteTagMutation }
}
