import { useSortable } from "@dnd-kit/sortable"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ContextMenu } from "@base-ui/react/context-menu"
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

  const headerContent = (
    <div ref={setNodeRef} style={style} className="planning-group" {...attributes}>
      <div className="planning-group-header" {...listeners} onClick={onToggleCollapse}>
        <button
          type="button"
          className="category-collapse-btn"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
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
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <span onClick={(e) => e.stopPropagation()}>
            <InlineEditName
              value={group.groupName}
              onSave={(name) => onRenameGroup(group.groupId, name)}
              isSaving={isGroupUpdating}
              className="planning-group-name"
              inputWidth="14rem"
            />
          </span>
        )}

        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="planning-group-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="planning-add-category-btn"
            title="Add category to group"
            onClick={() => onAddCategory(group.groupId)}
          >
            +
          </button>
        </div>
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

  if (isUncategorized) return headerContent

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<div style={{ display: "contents" }} />}>
        {headerContent}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="context-menu-positioner" sideOffset={4}>
          <ContextMenu.Popup className="context-menu-popup">
            <ContextMenu.Item
              className="context-menu-item context-menu-item-danger"
              onClick={() => onDeleteGroup(group.groupId, group.groupName)}
            >
              Delete group
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
