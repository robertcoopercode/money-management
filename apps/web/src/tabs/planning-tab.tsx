import { useState, useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { generateKeyBetween } from "@ledgr/shared"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { apiFetch } from "../lib/api.js"
import { usePlanningMutations } from "../hooks/use-planning-mutations.js"
import { useCategoryMutations } from "../hooks/use-category-mutations.js"
import { TextInput } from "../components/text-input.js"
import { AppDialog } from "../components/app-dialog.js"
import { PlanningToolbar } from "../components/planning-toolbar.js"
import { PlanningGroupSection } from "../components/planning-group.js"
import {
  DeleteImpactDialog,
  type DeleteDialogState,
  type CategoryDeleteImpact,
  type CategoryGroupDeleteImpact,
} from "../components/delete-impact-dialog.js"
import { AutoCoverDialog, type AutoCoverItem } from "../components/auto-cover-dialog.js"
import type { PlanningResponse, PlanningGroup, PlanningCategoryItem } from "../types.js"

const UNCATEGORIZED_GROUP_ID = "__uncategorized__"

type PlanningTabProps = {
  month: string
  onMonthChange: (updater: (current: string) => string) => void
  planningData: PlanningResponse | undefined
  planningIsLoading: boolean
  planningIsError: boolean
  planningError: Error | null
  refetchCoreData: () => void
}

const parseId = (dndId: string) => {
  if (dndId.startsWith("group:")) return { type: "group" as const, id: dndId.slice(6) }
  if (dndId.startsWith("cat:")) return { type: "cat" as const, id: dndId.slice(4) }
  return null
}

/** Move a category between groups in a groups array (pure function). */
const moveCategoryToGroup = (
  groups: PlanningGroup[],
  categoryId: string,
  targetGroupId: string,
  targetIndex: number,
): PlanningGroup[] => {
  let movedCat: PlanningCategoryItem | undefined
  // Remove from current group
  const without = groups.map((g) => {
    const idx = g.categories.findIndex((c) => c.categoryId === categoryId)
    if (idx !== -1) {
      movedCat = g.categories[idx]
      return { ...g, categories: g.categories.filter((c) => c.categoryId !== categoryId) }
    }
    return g
  })
  if (!movedCat) return groups

  // Insert into target group at targetIndex
  return without.map((g) => {
    if (g.groupId === targetGroupId) {
      const cats = [...g.categories]
      cats.splice(targetIndex, 0, movedCat!)
      return { ...g, categories: cats }
    }
    return g
  })
}

export const PlanningTab = ({
  month,
  onMonthChange,
  planningData,
  planningIsLoading,
  planningIsError,
  planningError,
  refetchCoreData,
}: PlanningTabProps) => {
  const queryClient = useQueryClient()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragGroups, setDragGroups] = useState<PlanningGroup[] | null>(null)
  const [newGroupPrompt, setNewGroupPrompt] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [addCategoryGroupId, setAddCategoryGroupId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [autoCoverItems, setAutoCoverItems] = useState<AutoCoverItem[]>([])

  // Keep a ref to the overlay label so it doesn't change when we move the item between groups
  const activeCategoryLabel = useRef<string | null>(null)

  const { assignMutation, autoCoverMutation, moveBudgetMutation } = usePlanningMutations({ month, refetchCoreData })

  const {
    updateCategoryMutation,
    deleteCategoryMutation,
    updateCategoryGroupMutation,
    deleteCategoryGroupMutation,
    createCategoryGroupMutation,
    createCategoryMutation,
    reorderCategoryMutation,
    reorderCategoryGroupMutation,
  } = useCategoryMutations({
    refetchCoreData,
    onCategoryDeleted: () => setDeleteDialog(null),
    onGroupDeleted: () => setDeleteDialog(null),
    onGroupCreated: () => {
      setNewGroupPrompt(false)
      setNewGroupName("")
    },
  })

  const serverGroups = planningData?.groups ?? []
  // During a category drag, render from dragGroups; otherwise from server data
  const groups = dragGroups ?? serverGroups
  const groupIds = groups.map((g) => `group:${g.groupId}`)

  const underfundedCategories = serverGroups
    .flatMap((g) => g.categories)
    .filter((c) => c.availableMinor < 0 && !c.isIncomeCategory)

  const handleAutoCover = useCallback(() => {
    if (underfundedCategories.length === 0) return
    setAutoCoverItems(
      underfundedCategories.map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        currentAssignedMinor: c.assignedMinor,
        deficitMinor: Math.abs(c.availableMinor),
        newAssignedMinor: c.assignedMinor + Math.abs(c.availableMinor),
      })),
    )
  }, [underfundedCategories])

  const confirmAutoCover = useCallback(() => {
    if (autoCoverItems.length === 0) return
    autoCoverMutation.mutate(
      autoCoverItems.map((item) => ({
        categoryId: item.categoryId,
        assignedMinor: item.newAssignedMinor,
      })),
      { onSuccess: () => setAutoCoverItems([]) },
    )
  }, [autoCoverItems, autoCoverMutation])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const toggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      const impact = await apiFetch<CategoryDeleteImpact>(
        `/api/categories/${categoryId}/impact`,
      )
      setDeleteDialog({ type: "category", id: categoryId, name: categoryName, impact })
    } catch {
      setDeleteDialog({
        type: "category",
        id: categoryId,
        name: categoryName,
        impact: { transactions: 0, splits: 0, assignments: 0, payeeDefaults: 0 },
      })
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      const impact = await apiFetch<CategoryGroupDeleteImpact>(
        `/api/category-groups/${groupId}/impact`,
      )
      setDeleteDialog({ type: "group", id: groupId, name: groupName, impact })
    } catch {
      setDeleteDialog({
        type: "group",
        id: groupId,
        name: groupName,
        impact: { categories: 0 },
      })
    }
  }

  const confirmDelete = () => {
    if (!deleteDialog) return
    if (deleteDialog.type === "category") {
      deleteCategoryMutation.mutate(deleteDialog.id)
    } else {
      deleteCategoryGroupMutation.mutate(deleteDialog.id)
    }
  }

  const handleAssign = useCallback(
    (categoryId: string, assignedMinor: number) => {
      assignMutation.mutate({ categoryId, assignedMinor })
    },
    [assignMutation],
  )

  const handleRenameCategory = useCallback(
    (categoryId: string, name: string) => {
      updateCategoryMutation.mutate({ categoryId, name })
    },
    [updateCategoryMutation],
  )

  const handleToggleIncome = useCallback(
    (categoryId: string, isIncome: boolean) => {
      updateCategoryMutation.mutate({ categoryId, isIncomeCategory: isIncome })
    },
    [updateCategoryMutation],
  )

  const handleMoveBudget = useCallback(
    (fromCategoryId: string, toCategoryId: string, amountMinor: number) => {
      moveBudgetMutation.mutate({ fromCategoryId, toCategoryId, amountMinor })
    },
    [moveBudgetMutation],
  )

  const handleRenameGroup = useCallback(
    (groupId: string, name: string) => {
      updateCategoryGroupMutation.mutate({ groupId, name })
    },
    [updateCategoryGroupMutation],
  )

  const handleCreateGroup = () => {
    setNewGroupPrompt(true)
  }

  const submitNewGroup = () => {
    const trimmed = newGroupName.trim()
    if (!trimmed) return
    createCategoryGroupMutation.mutate(trimmed)
  }

  const handleAddCategory = (groupId: string) => {
    setAddCategoryGroupId(groupId)
    setNewCategoryName("")
  }

  const submitNewCategory = () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed || !addCategoryGroupId) return
    const group = groups.find((g) => g.groupId === addCategoryGroupId)
    createCategoryMutation.mutate(
      { name: trimmed, groupName: group?.groupName },
      { onSuccess: () => { setAddCategoryGroupId(null); setNewCategoryName("") } },
    )
  }

  // --- DnD handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveId(id)
    const parsed = parseId(id)
    if (parsed?.type === "cat") {
      // Snapshot the groups for live manipulation during drag
      setDragGroups(serverGroups.map((g) => ({ ...g, categories: [...g.categories] })))
      // Capture label for overlay
      for (const g of serverGroups) {
        const cat = g.categories.find((c) => c.categoryId === parsed.id)
        if (cat) {
          activeCategoryLabel.current = cat.categoryName
          break
        }
      }
    } else {
      activeCategoryLabel.current = null
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !dragGroups) return

    const activeItem = parseId(active.id as string)
    const overItem = parseId(over.id as string)
    if (!activeItem || activeItem.type !== "cat" || !overItem) return

    // Find which group the active cat is currently in (within dragGroups)
    let currentGroupId: string | undefined
    for (const g of dragGroups) {
      const idx = g.categories.findIndex((c) => c.categoryId === activeItem.id)
      if (idx !== -1) {
        currentGroupId = g.groupId
        break
      }
    }
    if (!currentGroupId) return

    // Determine the target group and index
    let targetGroupId: string | undefined
    let targetIndex: number = 0

    if (overItem.type === "group") {
      targetGroupId = overItem.id
      const tg = dragGroups.find((g) => g.groupId === targetGroupId)
      targetIndex = tg ? tg.categories.filter((c) => c.categoryId !== activeItem.id).length : 0
    } else {
      // overItem is a category — find its group and position
      for (const g of dragGroups) {
        const idx = g.categories.findIndex((c) => c.categoryId === overItem.id)
        if (idx !== -1) {
          targetGroupId = g.groupId
          targetIndex = idx
          break
        }
      }
    }

    if (!targetGroupId) return

    // Only handle cross-group moves here; dnd-kit handles same-group
    // reordering visually via its own transforms
    if (currentGroupId === targetGroupId) return

    setDragGroups(moveCategoryToGroup(dragGroups, activeItem.id, targetGroupId, targetIndex))
  }

  // Optimistically update the React Query cache
  const patchPlanningCache = (updater: (prev: PlanningResponse) => PlanningResponse) => {
    queryClient.setQueryData<PlanningResponse>(["planning", month], (prev) =>
      prev ? updater(prev) : prev,
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const currentDragGroups = dragGroups

    if (!over) {
      setDragGroups(null)
      setActiveId(null)
      activeCategoryLabel.current = null
      return
    }

    const activeItem = parseId(active.id as string)
    const overItem = parseId(over.id as string)
    if (!activeItem || !overItem) {
      setDragGroups(null)
      setActiveId(null)
      activeCategoryLabel.current = null
      return
    }

    // Use the live drag groups to determine final positions
    const resolvedGroups = currentDragGroups ?? serverGroups

    // Check if dragGroups moved the category to a different group
    const hasDragGroupChanges = !!currentDragGroups && activeItem.type === "cat" && (() => {
      let serverGroupId: string | undefined
      for (const g of serverGroups) {
        if (g.categories.some((c) => c.categoryId === activeItem.id)) {
          serverGroupId = g.groupId
          break
        }
      }
      let dragGroupId: string | undefined
      for (const g of currentDragGroups) {
        if (g.categories.some((c) => c.categoryId === activeItem.id)) {
          dragGroupId = g.groupId
          break
        }
      }
      return serverGroupId !== dragGroupId
    })()

    // If dropped on itself and no cross-group move happened, it's a no-op
    if (active.id === over.id && !hasDragGroupChanges) {
      setDragGroups(null)
      setActiveId(null)
      activeCategoryLabel.current = null
      return
    }

    if (activeItem.type === "group" && overItem.type === "group") {
      const oldIndex = serverGroups.findIndex((g) => g.groupId === activeItem.id)
      const newIndex = serverGroups.findIndex((g) => g.groupId === overItem.id)
      if (oldIndex === -1 || newIndex === -1) {
        setDragGroups(null)
        setActiveId(null)
        activeCategoryLabel.current = null
        return
      }

      const newSortOrder = generateKeyBetween(
        newIndex < oldIndex ? (newIndex > 0 ? serverGroups[newIndex - 1]?.groupSortOrder ?? null : null) : serverGroups[newIndex]!.groupSortOrder,
        newIndex < oldIndex ? serverGroups[newIndex]!.groupSortOrder : (newIndex < serverGroups.length - 1 ? serverGroups[newIndex + 1]?.groupSortOrder ?? null : null),
      )

      patchPlanningCache((prev) => {
        const updated = prev.groups.map((g) =>
          g.groupId === activeItem.id ? { ...g, groupSortOrder: newSortOrder } : g,
        )
        updated.sort((a, b) => a.groupSortOrder.localeCompare(b.groupSortOrder))
        return { ...prev, groups: updated }
      })

      setDragGroups(null)
      setActiveId(null)
      activeCategoryLabel.current = null

      reorderCategoryGroupMutation.mutate({
        groupId: activeItem.id,
        sortOrder: newSortOrder,
      })
    } else if (activeItem.type === "cat") {
      // Find the source group from original server data
      let originalSourceGroup: PlanningGroup | undefined
      for (const g of serverGroups) {
        if (g.categories.some((c) => c.categoryId === activeItem.id)) {
          originalSourceGroup = g
          break
        }
      }

      // Find which group the category is currently in (after drag-over moves)
      let finalGroup: PlanningGroup | undefined
      for (const g of resolvedGroups) {
        if (g.categories.some((c) => c.categoryId === activeItem.id)) {
          finalGroup = g
          break
        }
      }

      if (!finalGroup || !originalSourceGroup) {
        setDragGroups(null)
        setActiveId(null)
        activeCategoryLabel.current = null
        return
      }

      const isCrossGroup = originalSourceGroup.groupId !== finalGroup.groupId

      // Build the final category order for the target group
      let reorderedCats: PlanningCategoryItem[]

      if (isCrossGroup) {
        // Cross-group: dragGroups already has the item in the right group from onDragOver
        reorderedCats = finalGroup.categories
      } else {
        // Same-group: dnd-kit handled the visual preview, so we need to
        // array-move active to over's position to match what was shown
        const cats = [...finalGroup.categories]
        const activeIdx = cats.findIndex((c) => c.categoryId === activeItem.id)
        if (overItem.type === "cat") {
          const overIdx = cats.findIndex((c) => c.categoryId === overItem.id)
          if (activeIdx !== -1 && overIdx !== -1) {
            const [moved] = cats.splice(activeIdx, 1)
            cats.splice(overIdx, 0, moved!)
          }
        }
        reorderedCats = cats
      }

      const newIndex = reorderedCats.findIndex((c) => c.categoryId === activeItem.id)

      // Compute sort order from neighbors in the visual order
      let prevSortOrder: string | null = null
      let nextSortOrder: string | null = null

      if (newIndex <= 0) {
        nextSortOrder = reorderedCats[1]?.sortOrder ?? null
      } else if (newIndex >= reorderedCats.length - 1) {
        prevSortOrder = reorderedCats[newIndex - 1]?.sortOrder ?? null
      } else {
        prevSortOrder = reorderedCats[newIndex - 1]?.sortOrder ?? null
        nextSortOrder = reorderedCats[newIndex + 1]?.sortOrder ?? null
      }

      const newSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder)

      const groupIdForApi =
        finalGroup.groupId === UNCATEGORIZED_GROUP_ID
          ? null
          : finalGroup.groupId

      // Commit optimistic update to cache — use the exact visual order
      patchPlanningCache((prev) => {
        const movedCat = originalSourceGroup!.categories.find(
          (c) => c.categoryId === activeItem.id,
        )
        if (!movedCat) return prev

        const updatedCat = { ...movedCat, sortOrder: newSortOrder }

        const finalList = reorderedCats.map((c) =>
          c.categoryId === activeItem.id ? updatedCat : c,
        )

        const updatedGroups = prev.groups.map((g) => {
          if (isCrossGroup && g.groupId === originalSourceGroup!.groupId) {
            return {
              ...g,
              categories: g.categories.filter((c) => c.categoryId !== activeItem.id),
            }
          }
          if (g.groupId === finalGroup!.groupId) {
            return { ...g, categories: finalList }
          }
          return g
        })

        return { ...prev, groups: updatedGroups }
      })

      setDragGroups(null)
      setActiveId(null)
      activeCategoryLabel.current = null

      reorderCategoryMutation.mutate({
        categoryId: activeItem.id,
        sortOrder: newSortOrder,
        groupId: isCrossGroup ? groupIdForApi : undefined,
      })
    } else {
      setDragGroups(null)
      setActiveId(null)
      activeCategoryLabel.current = null
    }
  }

  const handleDragCancel = () => {
    setDragGroups(null)
    setActiveId(null)
    activeCategoryLabel.current = null
  }

  // Find the active dragging element for overlay
  const activeParsed = activeId ? parseId(activeId) : null
  let activeGroupForOverlay: PlanningGroup | undefined
  if (activeParsed?.type === "group") {
    activeGroupForOverlay = serverGroups.find((g) => g.groupId === activeParsed.id)
  }

  return (
    <section className="card">
      <PlanningToolbar
        month={month}
        onMonthChange={onMonthChange}
        readyToAssignMinor={planningData?.readyToAssignMinor ?? 0}
        onCreateGroup={handleCreateGroup}
        onAutoCover={handleAutoCover}
        autoCoverDisabled={underfundedCategories.length === 0 || autoCoverMutation.isPending}
      />

      {planningIsError ? (
        <p className="error-text">
          {toDisplayErrorMessage(planningError, "Failed to load planning data.")}
        </p>
      ) : null}

      {planningIsLoading ? (
        <p className="muted">Loading planning data...</p>
      ) : groups.length === 0 ? (
        <p className="muted">
          No planning categories available yet. Run database seed data.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
            {groups.map((group) => (
              <PlanningGroupSection
                key={group.groupId}
                group={group}
                allGroups={groups}
                readyToAssignMinor={planningData?.readyToAssignMinor ?? 0}
                isCollapsed={collapsedGroups.has(group.groupId)}
                onToggleCollapse={() => toggleCollapse(group.groupId)}
                onRenameGroup={handleRenameGroup}
                onDeleteGroup={(id, name) => void handleDeleteGroup(id, name)}
                onAddCategory={handleAddCategory}
                onAssign={handleAssign}
                onRenameCategory={handleRenameCategory}
                onDeleteCategory={(id, name) => void handleDeleteCategory(id, name)}
                onToggleIncome={handleToggleIncome}
                onMoveBudget={handleMoveBudget}
                isMovePending={moveBudgetMutation.isPending}
                isGroupUpdating={updateCategoryGroupMutation.isPending}
                isCategoryUpdating={updateCategoryMutation.isPending}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeGroupForOverlay ? (
              <div className="planning-drag-overlay planning-drag-overlay-group">
                {activeGroupForOverlay.groupName}
              </div>
            ) : activeCategoryLabel.current ? (
              <div className="planning-drag-overlay planning-drag-overlay-category">
                {activeCategoryLabel.current}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <AppDialog
        open={newGroupPrompt}
        onOpenChange={(open) => { if (!open) setNewGroupPrompt(false) }}
        title="New Category Group"
      >
        <TextInput
          autoFocus
          placeholder="Group name"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNewGroup()
            if (e.key === "Escape") setNewGroupPrompt(false)
          }}
        />
        <div className="dialog-actions">
          <button onClick={() => setNewGroupPrompt(false)} style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}>
            Cancel
          </button>
          <button onClick={submitNewGroup} disabled={createCategoryGroupMutation.isPending || !newGroupName.trim()}>
            {createCategoryGroupMutation.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </AppDialog>

      <AppDialog
        open={addCategoryGroupId !== null}
        onOpenChange={(open) => { if (!open) setAddCategoryGroupId(null) }}
        title="New Category"
      >
        <p className="muted" style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
          in {groups.find((g) => g.groupId === addCategoryGroupId)?.groupName ?? "group"}
        </p>
        <TextInput
          autoFocus
          placeholder="Category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNewCategory()
            if (e.key === "Escape") setAddCategoryGroupId(null)
          }}
        />
        <div className="dialog-actions">
          <button onClick={() => setAddCategoryGroupId(null)} style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}>
            Cancel
          </button>
          <button onClick={submitNewCategory} disabled={createCategoryMutation.isPending || !newCategoryName.trim()}>
            {createCategoryMutation.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </AppDialog>

      <AutoCoverDialog
        items={autoCoverItems}
        onClose={() => setAutoCoverItems([])}
        onConfirm={confirmAutoCover}
        isPending={autoCoverMutation.isPending}
      />

      <DeleteImpactDialog
        state={deleteDialog}
        onClose={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
        isPending={deleteCategoryMutation.isPending || deleteCategoryGroupMutation.isPending}
      />
    </section>
  )
}
