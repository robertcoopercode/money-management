import { useState, useRef, useEffect } from "react"
import { formatMoney, parseMoneyInputToMinor } from "@ledgr/shared"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Popover } from "@base-ui/react/popover"
import { ContextMenu } from "@base-ui/react/context-menu"
import { TextInput } from "./text-input.js"
import { InlineEditName } from "./inline-edit-name.js"
import { MoveMoneyContent } from "./move-money-popover.js"
import { ActivityPopover } from "./activity-popover.js"
import type { PlanningCategoryItem, PlanningGroup } from "../types.js"

type PlanningCategoryRowProps = {
  category: PlanningCategoryItem
  groups: PlanningGroup[]
  readyToAssignMinor: number
  month: string
  onAssign: (categoryId: string, assignedMinor: number) => void
  onRename: (categoryId: string, name: string) => void
  onDelete: (categoryId: string, name: string) => void
  onToggleIncome: (categoryId: string, isIncome: boolean) => void
  onMoveBudget: (fromCategoryId: string, toCategoryId: string, amountMinor: number) => void
  isMovePending: boolean
  isUpdating: boolean
  onNavigateToTransaction: (transactionId: string) => void
}

export const PlanningCategoryRow = ({
  category,
  groups,
  readyToAssignMinor,
  month,
  onAssign,
  onRename,
  onDelete,
  onToggleIncome,
  onMoveBudget,
  isMovePending,
  isUpdating,
  onNavigateToTransaction,
}: PlanningCategoryRowProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editingAssigned, setEditingAssigned] = useState(false)
  const assignedInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingAssigned && assignedInputRef.current) {
      assignedInputRef.current.focus()
      assignedInputRef.current.select()
    }
  }, [editingAssigned])

  const commitAssigned = (value: string) => {
    setEditingAssigned(false)
    onAssign(category.categoryId, parseMoneyInputToMinor(value))
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `cat:${category.categoryId}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<div style={{ display: "contents" }} />}>
        <div ref={setNodeRef} style={style} className="planning-category-row" {...attributes} {...listeners}>
          <div className="planning-category-name">
            <InlineEditName
              value={category.categoryName}
              onSave={(name) => onRename(category.categoryId, name)}
              isSaving={isUpdating}
              inputWidth="10rem"
            />
            {category.isIncomeCategory && (
              <span
                style={{
                  fontSize: "0.65rem",
                  padding: "0.05rem 0.35rem",
                  borderRadius: "4px",
                  background: "rgb(34 197 94 / 15%)",
                  color: "rgb(34 197 94)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  marginLeft: "0.35rem",
                }}
              >
                Income
              </span>
            )}
          </div>
          {category.isIncomeCategory ? (
            <>
              <div className="planning-cell planning-cell-input" />
              <div className="planning-cell">
                <ActivityPopover
                  categoryId={category.categoryId}
                  categoryName={category.categoryName}
                  activityMinor={category.activityMinor}
                  month={month}
                  onNavigateToTransaction={onNavigateToTransaction}
                />
              </div>
              <div className="planning-cell" />
            </>
          ) : (
            <>
              <div className="planning-cell planning-cell-input">
                {editingAssigned ? (
                  <TextInput
                    ref={assignedInputRef}
                    key={category.assignedMinor}
                    className="small-input"
                    defaultValue={(category.assignedMinor / 100).toString()}
                    onBlur={(event) => commitAssigned(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur()
                      } else if (event.key === "Escape") {
                        setEditingAssigned(false)
                      } else if (event.key === "Tab") {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="planning-assigned-badge"
                    onClick={() => setEditingAssigned(true)}
                  >
                    {formatMoney(category.assignedMinor)}
                  </button>
                )}
              </div>
              <div className="planning-cell">
                <ActivityPopover
                  categoryId={category.categoryId}
                  categoryName={category.categoryName}
                  activityMinor={category.activityMinor}
                  month={month}
                  onNavigateToTransaction={onNavigateToTransaction}
                />
              </div>
              <div className="planning-cell">
                <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <Popover.Trigger
                    className={`planning-available-badge${
                      category.availableMinor < 0
                        ? " planning-available-badge-negative"
                        : category.availableMinor > 0
                          ? " planning-available-badge-positive"
                          : " planning-available-badge-zero"
                    }`}
                    disabled={category.availableMinor === 0}
                  >
                    {formatMoney(category.availableMinor)}
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Positioner
                      className="move-money-positioner"
                      sideOffset={6}
                      side="bottom"
                      align="end"
                    >
                      <Popover.Popup className="move-money-popup">
                        <MoveMoneyContent
                          categoryId={category.categoryId}
                          availableMinor={category.availableMinor}
                          readyToAssignMinor={readyToAssignMinor}
                          groups={groups}
                          onMove={(from, to, amount) => {
                            onMoveBudget(from, to, amount)
                            setPopoverOpen(false)
                          }}
                          onClose={() => setPopoverOpen(false)}
                          isPending={isMovePending}
                        />
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            </>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="context-menu-positioner" sideOffset={4}>
          <ContextMenu.Popup className="context-menu-popup">
            <ContextMenu.Item
              className="context-menu-item"
              onClick={() => onToggleIncome(category.categoryId, !category.isIncomeCategory)}
            >
              {category.isIncomeCategory ? "Remove income flag" : "Mark as income category"}
            </ContextMenu.Item>
            <ContextMenu.Item
              className="context-menu-item context-menu-item-danger"
              onClick={() => onDelete(category.categoryId, category.categoryName)}
            >
              Delete category
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
