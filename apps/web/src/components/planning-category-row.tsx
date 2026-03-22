import { useState } from "react"
import { formatMoney, parseMoneyInputToMinor } from "@ledgr/shared"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Popover } from "@base-ui/react/popover"
import { TextInput } from "./text-input.js"
import { InlineEditName } from "./inline-edit-name.js"
import { MoveMoneyContent } from "./move-money-popover.js"
import type { PlanningCategoryItem, PlanningGroup } from "../types.js"

type PlanningCategoryRowProps = {
  category: PlanningCategoryItem
  groups: PlanningGroup[]
  readyToAssignMinor: number
  onAssign: (categoryId: string, assignedMinor: number) => void
  onRename: (categoryId: string, name: string) => void
  onDelete: (categoryId: string, name: string) => void
  onToggleIncome: (categoryId: string, isIncome: boolean) => void
  onMoveBudget: (fromCategoryId: string, toCategoryId: string, amountMinor: number) => void
  isMovePending: boolean
  isUpdating: boolean
}

export const PlanningCategoryRow = ({
  category,
  groups,
  readyToAssignMinor,
  onAssign,
  onRename,
  onDelete,
  onToggleIncome,
  onMoveBudget,
  isMovePending,
  isUpdating,
}: PlanningCategoryRowProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
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
    <div ref={setNodeRef} style={style} className="planning-category-row" {...attributes}>
      <div className="planning-drag-handle" {...listeners}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="6" r="1.5" fill="currentColor" />
          <circle cx="15" cy="6" r="1.5" fill="currentColor" />
          <circle cx="9" cy="12" r="1.5" fill="currentColor" />
          <circle cx="15" cy="12" r="1.5" fill="currentColor" />
          <circle cx="9" cy="18" r="1.5" fill="currentColor" />
          <circle cx="15" cy="18" r="1.5" fill="currentColor" />
        </svg>
      </div>
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
          <div className="planning-cell">{formatMoney(category.activityMinor)}</div>
          <div className="planning-cell" />
        </>
      ) : (
        <>
          <div className="planning-cell planning-cell-input">
            <TextInput
              key={category.assignedMinor}
              className="small-input"
              defaultValue={(category.assignedMinor / 100).toString()}
              onBlur={(event) =>
                onAssign(
                  category.categoryId,
                  parseMoneyInputToMinor(event.target.value),
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur()
                } else if (event.key === "Tab") {
                  event.preventDefault()
                  const inputs = Array.from(
                    document.querySelectorAll<HTMLInputElement>(".planning-category-row .small-input"),
                  )
                  const idx = inputs.indexOf(event.currentTarget)
                  const next = inputs[event.shiftKey ? idx - 1 : idx + 1]
                  if (next) {
                    event.currentTarget.blur()
                    next.focus()
                    next.select()
                  }
                }
              }}
            />
          </div>
          <div className="planning-cell">{formatMoney(category.activityMinor)}</div>
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
      <div className="planning-cell planning-cell-actions">
        <button
          type="button"
          className={category.isIncomeCategory ? "planning-income-active" : undefined}
          title={category.isIncomeCategory ? "Remove income flag" : "Mark as income category"}
          onClick={() => onToggleIncome(category.categoryId, !category.isIncomeCategory)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-button-danger"
          title="Delete category"
          onClick={() => onDelete(category.categoryId, category.categoryName)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
