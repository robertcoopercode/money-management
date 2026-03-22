import { useSortable } from "@dnd-kit/sortable"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { InlineEditName } from "./inline-edit-name.js"
import { PlanningCategoryRow } from "./planning-category-row.js"
import type { PlanningGroup as PlanningGroupType } from "../types.js"

const UNCATEGORIZED_GROUP_ID = "__uncategorized__"

type PlanningGroupProps = {
  group: PlanningGroupType
  allGroups: PlanningGroupType[]
  readyToAssignMinor: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  onRenameGroup: (groupId: string, name: string) => void
  onDeleteGroup: (groupId: string, name: string) => void
  onAddCategory: (groupId: string) => void
  onAssign: (categoryId: string, assignedMinor: number) => void
  onRenameCategory: (categoryId: string, name: string) => void
  onDeleteCategory: (categoryId: string, name: string) => void
  onToggleIncome: (categoryId: string, isIncome: boolean) => void
  onMoveBudget: (fromCategoryId: string, toCategoryId: string, amountMinor: number) => void
  isMovePending: boolean
  isGroupUpdating: boolean
  isCategoryUpdating: boolean
}

export const PlanningGroupSection = ({
  group,
  allGroups,
  readyToAssignMinor,
  isCollapsed,
  onToggleCollapse,
  onRenameGroup,
  onDeleteGroup,
  onAddCategory,
  onAssign,
  onRenameCategory,
  onDeleteCategory,
  onToggleIncome,
  onMoveBudget,
  isMovePending,
  isGroupUpdating,
  isCategoryUpdating,
}: PlanningGroupProps) => {
  const isUncategorized = group.groupId === UNCATEGORIZED_GROUP_ID

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group:${group.groupId}`,
    disabled: isUncategorized ? { draggable: true, droppable: false } : false,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  const categoryIds = group.categories.map((c) => `cat:${c.categoryId}`)

  return (
    <div ref={setNodeRef} style={style} className="planning-group" {...attributes}>
      <div className="planning-group-header">
        {!isUncategorized && (
          <div className="planning-drag-handle" {...listeners} title="Drag to reorder group">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="6" r="1.5" fill="currentColor" />
              <circle cx="15" cy="6" r="1.5" fill="currentColor" />
              <circle cx="9" cy="12" r="1.5" fill="currentColor" />
              <circle cx="15" cy="12" r="1.5" fill="currentColor" />
              <circle cx="9" cy="18" r="1.5" fill="currentColor" />
              <circle cx="15" cy="18" r="1.5" fill="currentColor" />
            </svg>
          </div>
        )}

        <button
          type="button"
          className="category-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isUncategorized ? (
          <span className="planning-group-name">{group.groupName}</span>
        ) : (
          <InlineEditName
            value={group.groupName}
            onSave={(name) => onRenameGroup(group.groupId, name)}
            isSaving={isGroupUpdating}
            className="planning-group-name"
            inputWidth="14rem"
          />
        )}

        <span className="muted planning-group-count">
          {group.categories.length} categor{group.categories.length === 1 ? "y" : "ies"}
        </span>

        {!isUncategorized && (
          <div className="planning-group-actions">
            <button
              type="button"
              className="planning-add-category-btn"
              title="Add category to group"
              onClick={() => onAddCategory(group.groupId)}
            >
              +
            </button>
            <button
              type="button"
              className="icon-button-danger"
              title="Delete group"
              onClick={() => onDeleteGroup(group.groupId, group.groupName)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="planning-group-body">
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            {group.categories.length === 0 ? (
              <div className="planning-empty-group">
                <span className="muted">No categories</span>
              </div>
            ) : (
              group.categories.map((cat) => (
                <PlanningCategoryRow
                  key={cat.categoryId}
                  category={cat}
                  groups={allGroups}
                  readyToAssignMinor={readyToAssignMinor}
                  onAssign={onAssign}
                  onRename={onRenameCategory}
                  onDelete={onDeleteCategory}
                  onToggleIncome={onToggleIncome}
                  onMoveBudget={onMoveBudget}
                  isMovePending={isMovePending}
                  isUpdating={isCategoryUpdating}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  )
}
