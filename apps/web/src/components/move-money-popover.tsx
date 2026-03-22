import { useState } from "react"
import { formatMoney, parseMoneyInputToMinor } from "@ledgr/shared"
import { Select } from "@base-ui/react/select"
import { TextInput } from "./text-input.js"
import { ScrollArea } from "./scroll-area.js"
import type { PlanningGroup } from "../types.js"

const READY_TO_ASSIGN = "ready-to-assign"

type MoveMoneyContentProps = {
  categoryId: string
  availableMinor: number
  readyToAssignMinor: number
  groups: PlanningGroup[]
  onMove: (fromCategoryId: string, toCategoryId: string, amountMinor: number) => void
  onClose: () => void
  isPending: boolean
}

export const MoveMoneyContent = ({
  categoryId,
  availableMinor,
  readyToAssignMinor,
  groups,
  onMove,
  onClose,
  isPending,
}: MoveMoneyContentProps) => {
  const isOverspent = availableMinor < 0
  const defaultAmount = Math.abs(availableMinor)
  const [amountStr, setAmountStr] = useState((defaultAmount / 100).toString())
  const [selectedId, setSelectedId] = useState("")

  const handleConfirm = () => {
    const amountMinor = parseMoneyInputToMinor(amountStr)
    if (amountMinor <= 0 || !selectedId) return

    if (isOverspent) {
      onMove(selectedId, categoryId, amountMinor)
    } else {
      onMove(categoryId, selectedId, amountMinor)
    }
  }

  type SelectOption = {
    value: string
    label: string
    balance: number
  }

  type SelectGroup = {
    name: string
    options: SelectOption[]
  }

  const selectGroups: SelectGroup[] = [
    {
      name: "Inflow",
      options: [
        { value: READY_TO_ASSIGN, label: "Ready to Assign", balance: readyToAssignMinor },
      ],
    },
  ]

  for (const group of groups) {
    const eligible = group.categories.filter(
      (c) => c.categoryId !== categoryId && !c.isIncomeCategory,
    )
    if (eligible.length === 0) continue
    selectGroups.push({
      name: group.groupName,
      options: eligible.map((cat) => ({
        value: cat.categoryId,
        label: cat.categoryName,
        balance: cat.availableMinor,
      })),
    })
  }

  const allOptions = selectGroups.flatMap((g) => g.options)
  const selectedLabel =
    allOptions.find((o) => o.value === selectedId)?.label ?? null

  return (
    <div className="move-money-content">
      <div className="move-money-title">
        {isOverspent ? "Cover overspending from" : "Move"}
      </div>

      {!isOverspent && (
        <div className="move-money-field">
          <label className="move-money-label">Amount</label>
          <TextInput
            autoFocus
            className="move-money-input"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm()
            }}
          />
        </div>
      )}

      <div className="move-money-field">
        {!isOverspent && <label className="move-money-label">To</label>}
        <Select.Root
          value={selectedId}
          onValueChange={(v) => setSelectedId(v ?? "")}
        >
          <Select.Trigger className="move-money-select-trigger">
            <Select.Value placeholder="Select category..." className="app-select-value">
              {selectedLabel}
            </Select.Value>
            <Select.Icon className="app-select-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              className="move-money-select-positioner"
              sideOffset={4}
              side="bottom"
              align="start"
              alignItemWithTrigger={false}
            >
              <Select.Popup className="move-money-select-popup">
                <ScrollArea>
                  {selectGroups.map((group) => (
                    <Select.Group key={group.name}>
                      <Select.GroupLabel className="move-money-group-label">
                        {group.name}
                      </Select.GroupLabel>
                      {group.options.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value}
                          className="move-money-select-item"
                        >
                          <Select.ItemText className="move-money-item-name">
                            {option.label}
                          </Select.ItemText>
                          <span
                            className={
                              option.balance < 0
                                ? "planning-available-negative"
                                : option.balance > 0
                                  ? "planning-available-positive"
                                  : ""
                            }
                          >
                            {formatMoney(option.balance)}
                          </span>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  ))}
                </ScrollArea>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      {isOverspent && (
        <div className="move-money-field">
          <label className="move-money-label">Amount</label>
          <TextInput
            autoFocus
            className="move-money-input"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm()
            }}
          />
        </div>
      )}

      <div className="move-money-actions">
        <button
          type="button"
          className="move-money-btn-cancel"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="move-money-btn-confirm"
          onClick={handleConfirm}
          disabled={isPending || !selectedId || parseMoneyInputToMinor(amountStr) <= 0}
        >
          {isPending ? "..." : isOverspent ? "Cover" : "Move"}
        </button>
      </div>
    </div>
  )
}
