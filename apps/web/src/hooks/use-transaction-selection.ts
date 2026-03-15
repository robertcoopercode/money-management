import { useState, useCallback } from "react"
import type { Transaction } from "../types.js"

export function useTransactionSelection(transactions: Transaction[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setLastSelectedId(id)
  }, [])

  const rangeSelect = useCallback(
    (targetId: string) => {
      if (!lastSelectedId) {
        toggleSelection(targetId)
        return
      }
      const lastIndex = transactions.findIndex((t) => t.id === lastSelectedId)
      const targetIndex = transactions.findIndex((t) => t.id === targetId)
      if (lastIndex === -1 || targetIndex === -1) {
        toggleSelection(targetId)
        return
      }
      const start = Math.min(lastIndex, targetIndex)
      const end = Math.max(lastIndex, targetIndex)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (let i = start; i <= end; i++) {
          next.add(transactions[i]!.id)
        }
        return next
      })
      setLastSelectedId(targetId)
    },
    [lastSelectedId, transactions, toggleSelection],
  )

  const toggleSelectAll = useCallback(() => {
    if (transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)))
    }
  }, [transactions, selectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const allSelected =
    transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id))
  const someSelected = selectedIds.size > 0

  return {
    selectedIds,
    toggleSelection,
    rangeSelect,
    toggleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  }
}
