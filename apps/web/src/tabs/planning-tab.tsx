import { useState, useCallback, useRef, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCenter,
  getFirstCollision,
} from "@dnd-kit/core"
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
  UniqueIdentifier,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { generateKeyBetween } from "@ledgr/shared"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { apiFetch } from "../lib/api.js"
import { usePlanningMutations } from "../hooks/use-planning-mutations.js"
import { useCategoryMutations } from "../hooks/use-category-mutations.js"
import { useClientOrdering } from "../hooks/use-client-ordering.js"
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
import type { PlanningResponse, PlanningGroup } from "../types.js"

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

export const PlanningTab = ({
  month,
  onMonthChange,
  planningData,
  planningIsLoading,
  planningIsError,
  planningError,
  refetchCoreData,
}: PlanningTabProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newGroupPrompt, setNewGroupPrompt] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [addCategoryGroupId, setAddCategoryGroupId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [autoCoverItems, setAutoCoverItems] = useState<AutoCoverItem[]>([])

  // Keep a ref to the overlay label so it doesn't change when we move the item between groups
  const activeCategoryLabel = useRef<string | null>(null)

  // Track when we just moved an item to a new container — prevents collision detection jitter
  const recentlyMovedToNewContainer = useRef(false)
  const lastOverId = useRef<UniqueIdentifier | null>(null)

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

  const {
    groups,
    applyGroupReorder,
    applyCategoryReorder,
    snapshotOrdering,
    restoreSnapshot,
  } = useClientOrdering(month, planningData?.groups)
  const groupIds = groups.map((g) => `group:${g.groupId}`)

  // Reset the recentlyMovedToNewContainer flag after layout settles.
  // Only watch ordering-driven changes, not server refetches.
  const orderingVersion = useRef(0)
  const prevGroupIds = useRef("")
  const currentGroupIds = groups.map((g) => g.groupId + ":" + g.categories.map((c) => c.categoryId).join(",")).join("|")
  if (currentGroupIds !== prevGroupIds.current) {
    prevGroupIds.current = currentGroupIds
    orderingVersion.current += 1
  }
  const orderingVer = orderingVersion.current
  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false
    })
  }, [orderingVer])

  const underfundedCategories = groups
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
      const current = groups
        .flatMap((g) => g.categories)
        .find((c) => c.categoryId === categoryId)?.assignedMinor
      if (current === assignedMinor) return
      assignMutation.mutate({ categoryId, assignedMinor })
    },
    [assignMutation, groups],
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

  // --- Helpers for DnD ---

  /** Find which group a category belongs to */
  const findContainer = (id: string): string | undefined => {
    // Check if it's a group ID itself
    if (groups.some((g) => g.groupId === id)) return id
    // Otherwise find the group containing this category
    for (const g of groups) {
      if (g.categories.some((c) => c.categoryId === id)) return g.groupId
    }
    return undefined
  }

  // Custom collision detection following the canonical dnd-kit multi-container pattern.
  // Key: always exclude the active item from droppable candidates to prevent
  // closestCenter from returning the dragged item itself as the "over" target.
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const parsed = activeId ? parseId(activeId) : null

      // If dragging a group, only collide with other reorderable groups
      // (exclude self and Uncategorized, which must always stay last)
      if (parsed?.type === "group") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) =>
              String(container.id).startsWith("group:") &&
              container.id !== activeId &&
              container.id !== `group:${UNCATEGORIZED_GROUP_ID}`,
          ),
        })
      }

      // For categories, use pointerWithin first, fall back to rectIntersection
      const pointerIntersections = pointerWithin(args)
      const intersections =
        pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args)

      let overId = getFirstCollision(intersections, "id")

      if (overId != null) {
        const overStr = String(overId)
        const overParsed = parseId(overStr)

        // If hovering over a group container, drill into its categories
        // to find the closest specific category (excluding the active item)
        if (overParsed?.type === "group") {
          const group = groups.find((g) => g.groupId === overParsed.id)
          if (group && group.categories.length > 0) {
            const categoryDndIds = group.categories.map((c) => `cat:${c.categoryId}`)
            const closest = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  categoryDndIds.includes(String(container.id)) &&
                  container.id !== activeId,
              ),
            })
            if (closest.length > 0) {
              overId = closest[0]!.id
            }
            // If no other categories found (e.g., only the active item is in
            // this group), keep the group as the over target
          }
        }

        lastOverId.current = overId
        return [{ id: overId }]
      }

      // If we just moved to a new container, return the active id to prevent jitter
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : []
    },
    [activeId, groups],
  )

  // --- DnD handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveId(id)
    snapshotOrdering()
    const parsed = parseId(id)
    if (parsed?.type === "cat") {
      // Capture label for overlay
      for (const g of groups) {
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
    if (!over) return

    const activeDndId = String(active.id)
    const overDndId = String(over.id)

    const activeParsed = parseId(activeDndId)
    const overParsed = parseId(overDndId)

    if (!activeParsed || activeParsed.type !== "cat" || !overParsed) return

    const activeContainer = findContainer(activeParsed.id)
    const overContainer = overParsed.type === "group"
      ? overParsed.id
      : findContainer(overParsed.id)

    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      // Same container: reorder within the group
      if (overParsed.type !== "cat") return
      const group = groups.find((g) => g.groupId === activeContainer)
      if (!group) return
      const activeIdx = group.categories.findIndex((c) => c.categoryId === activeParsed.id)
      const overIdx = group.categories.findIndex((c) => c.categoryId === overParsed.id)
      if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return
      applyCategoryReorder(activeParsed.id, activeContainer, overIdx)
      return
    }

    // Cross container: move to different group
    const overGroup = groups.find((g) => g.groupId === overContainer)
    if (!overGroup) return

    let newIndex: number

    if (overParsed.type === "group") {
      // Dropped on the group itself — append to end
      newIndex = overGroup.categories.filter((c) => c.categoryId !== activeParsed.id).length
    } else {
      const overIndex = overGroup.categories.findIndex((c) => c.categoryId === overParsed.id)

      // Determine if active is below the over item using translated rect
      const isBelowOverItem =
        over &&
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height

      const modifier = isBelowOverItem ? 1 : 0
      newIndex = overIndex >= 0 ? overIndex + modifier : overGroup.categories.length
    }

    recentlyMovedToNewContainer.current = true
    applyCategoryReorder(activeParsed.id, overContainer, newIndex)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      restoreSnapshot()
      setActiveId(null)
      activeCategoryLabel.current = null
      return
    }

    const activeItem = parseId(active.id as string)
    const overItem = parseId(over.id as string)
    if (!activeItem || !overItem) {
      restoreSnapshot()
      setActiveId(null)
      activeCategoryLabel.current = null
      return
    }

    if (activeItem.type === "group" && overItem.type === "group") {
      const oldIndex = groups.findIndex((g) => g.groupId === activeItem.id)
      const newIndex = groups.findIndex((g) => g.groupId === overItem.id)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        setActiveId(null)
        activeCategoryLabel.current = null
        return
      }

      // Compute fractional sort key for the API
      const newSortOrder = generateKeyBetween(
        newIndex < oldIndex ? (newIndex > 0 ? groups[newIndex - 1]?.groupSortOrder ?? null : null) : groups[newIndex]!.groupSortOrder,
        newIndex < oldIndex ? groups[newIndex]!.groupSortOrder : (newIndex < groups.length - 1 ? groups[newIndex + 1]?.groupSortOrder ?? null : null),
      )

      // Update client ordering using arrayMove
      const reordered = arrayMove(groups, oldIndex, newIndex)
      applyGroupReorder(reordered.map((g) => g.groupId))

      setActiveId(null)
      activeCategoryLabel.current = null

      reorderCategoryGroupMutation.mutate({
        groupId: activeItem.id,
        sortOrder: newSortOrder,
      })
    } else if (activeItem.type === "cat") {
      // Ordering was already updated by handleDragOver — just read final position and persist
      const activeContainer = findContainer(activeItem.id)
      if (!activeContainer) {
        restoreSnapshot()
        setActiveId(null)
        activeCategoryLabel.current = null
        return
      }

      const finalGroup = groups.find((g) => g.groupId === activeContainer)
      if (!finalGroup) {
        restoreSnapshot()
        setActiveId(null)
        activeCategoryLabel.current = null
        return
      }

      const catIdx = finalGroup.categories.findIndex((c) => c.categoryId === activeItem.id)
      if (catIdx === -1) {
        setActiveId(null)
        activeCategoryLabel.current = null
        return
      }

      const prevSortOrder = catIdx > 0 ? finalGroup.categories[catIdx - 1]?.sortOrder ?? null : null
      const nextSortOrder = catIdx < finalGroup.categories.length - 1 ? finalGroup.categories[catIdx + 1]?.sortOrder ?? null : null
      const newSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder)

      const groupIdForApi = finalGroup.groupId === UNCATEGORIZED_GROUP_ID ? null : finalGroup.groupId

      // Check if this was a cross-group move (compare against original server data)
      let isCrossGroup = false
      if (planningData?.groups) {
        for (const g of planningData.groups) {
          if (g.categories.some((c) => c.categoryId === activeItem.id)) {
            isCrossGroup = g.groupId !== finalGroup.groupId
            break
          }
        }
      }

      setActiveId(null)
      activeCategoryLabel.current = null

      reorderCategoryMutation.mutate({
        categoryId: activeItem.id,
        sortOrder: newSortOrder,
        groupId: isCrossGroup ? groupIdForApi : undefined,
      })
    } else {
      setActiveId(null)
      activeCategoryLabel.current = null
    }
  }

  const handleDragCancel = () => {
    restoreSnapshot()
    setActiveId(null)
    activeCategoryLabel.current = null
  }

  // Find the active dragging element for overlay
  const activeParsed = activeId ? parseId(activeId) : null
  let activeGroupForOverlay: PlanningGroup | undefined
  if (activeParsed?.type === "group") {
    activeGroupForOverlay = groups.find((g) => g.groupId === activeParsed.id)
  }

  return (
    <section className="card">
      <PlanningToolbar
        month={month}
        onMonthChange={onMonthChange}
        readyToAssignMinor={planningData?.readyToAssignMinor ?? 0}
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
        <>
        <div className="planning-column-headers">
          <button type="button" className="planning-add-group-btn" onClick={handleCreateGroup}>
            + Group
          </button>
          <div className="planning-column-header">Assigned</div>
          <div className="planning-column-header">Activity</div>
          <div className="planning-column-header">Available</div>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
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
        </>
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
