import { formatMoney } from "@ledgr/shared"
import type { SplitDraft } from "../lib/transaction-entry.js"
import { getSplitBalanceStatus } from "../lib/transaction-entry.js"
import { CategoryAutocomplete } from "./category-autocomplete.js"
import { PayeeAutocomplete } from "./payee-autocomplete.js"
import { TagCombobox } from "./tag-combobox.js"
import type { Tag } from "../types.js"

type CategoryGroup = {
  id: string
  name: string
  categories: Array<{ id: string; name: string }>
}

type SplitEditorProps = {
  splits: SplitDraft[]
  parentAmountMinor: number
  onSplitsChange: (splits: SplitDraft[]) => void
  payees: Array<{ id: string; name: string }>
  accounts: Array<{ id: string; name: string; type: string }>
  categoryGroups: CategoryGroup[]
  onCreateCategory?: (input: { name: string; groupName: string }) => Promise<{ id: string; name: string }>
  isCreatingCategory?: boolean
  tags: Tag[]
  onCreateTag?: (name: string) => Promise<Tag>
}

export const SplitEditor = ({
  splits,
  parentAmountMinor,
  onSplitsChange,
  payees,
  accounts,
  categoryGroups,
  onCreateCategory,
  isCreatingCategory,
  tags,
  onCreateTag,
}: SplitEditorProps) => {
  const { isBalanced, isOverAssigned, remainingMinor } = getSplitBalanceStatus(
    splits,
    parentAmountMinor,
  )

  const updateSplit = (index: number, patch: Partial<SplitDraft>) => {
    const next = splits.map((s, i) => (i === index ? { ...s, ...patch } : s))
    onSplitsChange(next)
  }

  const canRemove = splits.length > 2

  const removeSplit = (index: number) => {
    if (!canRemove) return
    onSplitsChange(splits.filter((_, i) => i !== index))
  }

  const addSplit = () => {
    const isExpense = remainingMinor < 0
    onSplitsChange([
      ...splits,
      {
        categoryId: "",
        payeeId: "",
        note: "",
        amount:
          remainingMinor !== 0 ? String(Math.abs(remainingMinor) / 100) : "",
        isExpense,
        tagIds: [],
      },
    ])
  }

  return (
    <>
      {splits.map((split, index) => (
        <div key={index} className="split-row">
          <div className="split-cell split-cell-leading">
            <button
              type="button"
              className="split-remove-button"
              onClick={() => removeSplit(index)}
              disabled={!canRemove}
              aria-label="Remove split"
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
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
              </svg>
            </button>
          </div>
          <div className="split-cell split-cell-payee">
            <PayeeAutocomplete
              payees={payees}
              accounts={accounts}
              currentAccountId=""
              value={
                split.payeeId
                  ? {
                      kind: "payee" as const,
                      id: split.payeeId,
                      name:
                        payees.find((p) => p.id === split.payeeId)?.name ?? "",
                    }
                  : null
              }
              onChange={(selection) => {
                updateSplit(index, {
                  payeeId: selection?.kind === "payee" ? selection.id : "",
                })
              }}
              placeholder="Payee"
              initialInputValue={
                payees.find((p) => p.id === split.payeeId)?.name ?? ""
              }
            />
          </div>
          <div className="split-cell split-cell-category">
            <CategoryAutocomplete
              categoryGroups={categoryGroups}
              value={split.categoryId}
              onChange={(categoryId) => updateSplit(index, { categoryId })}
              onCreateCategory={onCreateCategory}
              isCreating={isCreatingCategory}
              placeholder="Category"
              initialInputValue={
                categoryGroups
                  .flatMap((g) => g.categories)
                  .find((c) => c.id === split.categoryId)?.name ?? ""
              }
            />
          </div>
          <div className="split-cell split-cell-note">
            <input
              value={split.note}
              onChange={(e) => updateSplit(index, { note: e.target.value })}
              placeholder="Note"
            />
          </div>
          <div className="split-cell split-cell-amount">
            <div className="amount-input-group">
              <button
                type="button"
                className={`sign-toggle ${
                  split.isExpense ? "sign-toggle-minus" : "sign-toggle-plus"
                }`}
                onClick={() =>
                  updateSplit(index, { isExpense: !split.isExpense })
                }
              >
                {split.isExpense ? "\u2212" : "+"}
              </button>
              <input
                value={split.amount}
                onChange={(e) => updateSplit(index, { amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="split-cell split-cell-tags">
            <TagCombobox
              tags={tags}
              selectedTagIds={split.tagIds}
              onChange={(tagIds) => updateSplit(index, { tagIds })}
              onCreateTag={onCreateTag}
            />
          </div>
        </div>
      ))}
      <div className="split-footer">
        <button type="button" className="split-add-button" onClick={addSplit}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
          Add another split
        </button>
        <span className="split-remaining-label">
          {isBalanced
            ? "Amount remaining to assign: "
            : isOverAssigned
              ? "Amount over-assigned: "
              : "Amount remaining to assign: "}
          <span
            className={
              isBalanced
                ? "split-remaining-balanced"
                : isOverAssigned
                  ? "split-remaining-over"
                  : "split-remaining-unbalanced"
            }
          >
            {formatMoney(Math.abs(remainingMinor))}
          </span>
        </span>
      </div>
    </>
  )
}
