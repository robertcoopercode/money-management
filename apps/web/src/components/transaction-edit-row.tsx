import { useEffect, useMemo, useRef } from "react"
import { parseMoneyInputToMinor } from "@ledgr/shared"
import { TextInput } from "./text-input.js"
import { AppCheckbox } from "./app-checkbox.js"
import { AccountCombobox } from "./account-combobox.js"
import { PayeeAutocomplete, type PayeeOption } from "./payee-autocomplete.js"
import { CategoryAutocomplete } from "./category-autocomplete.js"
import { TagCombobox } from "./tag-combobox.js"
import { ClearingStatusToggle } from "./clearing-status-toggle.js"
import { DatePicker } from "./date-picker.js"
import { SplitEditor } from "./split-editor.js"
import type { Tag } from "../types.js"
import type {
  TransactionDraft,
  EditableField,
  SplitDraft,
} from "../lib/transaction-entry.js"
import { derivePayeeSelection } from "../lib/transaction-entry.js"

type CategoryGroup = {
  id: string
  name: string
  categories: Array<{ id: string; name: string }>
}

type TransactionEditRowProps = {
  draft: TransactionDraft
  onDraftChange: (draft: TransactionDraft) => void
  focusField: EditableField | null
  focusSplitIndex?: number
  accounts: Array<{ id: string; name: string; type: string }>
  payees: Array<{ id: string; name: string; defaultCategory?: { id: string; name: string; groupId: string } | null }>
  tags: Tag[]
  categoryGroups: CategoryGroup[]
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  onCreatePayee?: (name: string) => Promise<{ id: string; name: string }>
  isCreatingPayee?: boolean
  onManagePayees?: () => void
  onCreateCategory?: (input: { name: string; groupName?: string }) => Promise<{ id: string; name: string }>
  isCreatingCategory?: boolean
  onCreateTag?: (name: string) => Promise<Tag>
}

const FIELD_TO_COLUMN: Record<EditableField, number> = {
  account: 1,
  date: 2,
  payee: 3,
  category: 4,
  note: 5,
  amount: 6,
  tags: 7,
  clearingStatus: 8,
}

export const TransactionEditRow = ({
  draft,
  onDraftChange,
  focusField,
  focusSplitIndex,
  accounts,
  payees,
  tags,
  categoryGroups,
  onSave,
  onCancel,
  isSaving,
  onCreatePayee,
  isCreatingPayee = false,
  onManagePayees,
  onCreateCategory,
  isCreatingCategory = false,
  onCreateTag,
}: TransactionEditRowProps) => {
  const formRef = useRef<HTMLFormElement>(null)

  const payeeSelection = useMemo(
    (): PayeeOption | null =>
      derivePayeeSelection(
        draft.payeeId,
        draft.transferAccountId,
        accounts,
        payees,
        draft.accountId,
        draft.isExpense,
      ),
    [draft.payeeId, draft.transferAccountId, accounts, payees, draft.accountId, draft.isExpense],
  )

  const initialAccountName = useMemo(
    () => accounts.find((a) => a.id === draft.accountId)?.name ?? "",
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only compute on mount
    [],
  )

  const initialPayeeName = useMemo(
    () => payeeSelection?.name ?? "",
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only compute on mount
    [],
  )

  const initialCategoryName = useMemo(() => {
    for (const group of categoryGroups) {
      const cat = group.categories.find((c) => c.id === draft.categoryId)
      if (cat) return cat.name
    }
    return ""
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only compute on mount
  }, [])

  useEffect(() => {
    if (!formRef.current) return
    if (focusSplitIndex != null) {
      const splitRows = formRef.current.querySelectorAll<HTMLElement>(
        ":scope > .split-row",
      )
      const splitRow = splitRows[focusSplitIndex]
      if (splitRow) {
        const splitFieldClass =
          focusField === "note"
            ? ".split-cell-note"
            : focusField === "amount"
              ? ".split-cell-amount"
              : focusField === "tags"
                ? ".split-cell-tags"
                : ".split-cell-category"
        const input = splitRow.querySelector<HTMLElement>(
          `${splitFieldClass} input`,
        )
        input?.focus()
        return
      }
    }
    if (!focusField) return
    const colIndex = FIELD_TO_COLUMN[focusField]
    const cells = formRef.current.querySelectorAll<HTMLElement>(
      ":scope > .transaction-cell",
    )
    const cell = cells[colIndex]
    if (!cell) return
    const input = cell.querySelector<HTMLElement>("input") ?? cell.querySelector<HTMLElement>("button")
    input?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on mount
  }, [])

  const update = (patch: Partial<TransactionDraft>) =>
    onDraftChange({ ...draft, ...patch })

  const hasSplits = draft.splits.length > 0
  const isTransfer = Boolean(draft.transferAccountId)
  const isLoanTransfer = useMemo(() => {
    if (!draft.transferAccountId) return false
    const sourceAccount = accounts.find((a) => a.id === draft.accountId)
    const targetAccount = accounts.find((a) => a.id === draft.transferAccountId)
    return sourceAccount?.type === "LOAN" || targetAccount?.type === "LOAN"
  }, [draft.accountId, draft.transferAccountId, accounts])

  const parentAmountMinor = draft.isExpense
    ? -Math.abs(parseMoneyInputToMinor(draft.amount || "0"))
    : Math.abs(parseMoneyInputToMinor(draft.amount || "0"))

  const toggleSplitMode = () => {
    if (hasSplits) {
      update({ splits: [], categoryId: "" })
    } else {
      update({
        splits: [
          {
            categoryId: draft.categoryId,
            payeeId: "",
            note: "",
            amount: "",
            isExpense: draft.isExpense,
            tagIds: [],
          },
          {
            categoryId: "",
            payeeId: "",
            note: "",
            amount: "",
            isExpense: draft.isExpense,
            tagIds: [],
          },
        ],
        categoryId: "",
      })
    }
  }

  return (
    <form
      className="transaction-row transaction-edit-row"
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          onCancel()
          return
        }
        if (e.key === "Tab" && formRef.current) {
          const focusable = formRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
          )
          if (focusable.length === 0) return
          const first = focusable[0]!
          const last = focusable[focusable.length - 1]!
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }}
    >
      <div className="transaction-cell transaction-cell-checkbox" role="cell">
        <AppCheckbox checked={true} onCheckedChange={() => {}} />
      </div>
      <div className="transaction-cell" data-field="account">
        <AccountCombobox
          accounts={accounts}
          value={draft.accountId}
          onChange={(accountId) => update({ accountId })}
          placeholder="Account"
          initialInputValue={initialAccountName}
        />
      </div>
      <div className="transaction-cell" data-field="date">
        <DatePicker
          value={draft.date}
          onChange={(date) => update({ date })}
          required
        />
      </div>
      <div className="transaction-cell" data-field="payee">
        <PayeeAutocomplete
          payees={payees}
          accounts={accounts}
          currentAccountId={draft.accountId}
          value={payeeSelection}
          onChange={(selection) => {
            if (!selection) {
              update({ payeeId: "", transferAccountId: "" })
            } else if (selection.kind === "transfer") {
              const patch: Partial<TransactionDraft> = {
                payeeId: "",
                transferAccountId: selection.accountId,
                splits: [],
              }
              if (!selection.isLoanPayment) {
                patch.categoryId = ""
              }
              update(patch)
            } else {
              const selectedPayee = payees.find((p) => p.id === selection.id)
              const patch: Partial<TransactionDraft> = {
                payeeId: selection.id,
                transferAccountId: "",
              }
              if (selectedPayee?.defaultCategory) {
                patch.categoryId = selectedPayee.defaultCategory.id
              }
              update(patch)
            }
          }}
          onCreatePayee={onCreatePayee}
          isCreating={isCreatingPayee}
          onManagePayees={onManagePayees}
          isExpense={draft.isExpense}
          initialInputValue={initialPayeeName}
        />
      </div>
      <div className="transaction-cell" data-field="category">
        {hasSplits ? (
          <div className="split-category-input-wrapper">
            <TextInput
              className="split-category-input"
              value="Split transaction"
              readOnly
              tabIndex={-1}
            />
            <button
              type="button"
              className="split-category-clear"
              onClick={toggleSplitMode}
              title="Remove splits"
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
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : isTransfer && !isLoanTransfer ? (
          <TextInput
            value="Not applicable"
            readOnly
            tabIndex={-1}
            className="transfer-category-readonly"
          />
        ) : (
          <CategoryAutocomplete
            value={draft.categoryId}
            categoryGroups={categoryGroups}
            onChange={(categoryId) => update({ categoryId })}
            onCreateCategory={onCreateCategory}
            isCreating={isCreatingCategory}
            onSplit={
              isTransfer && !isLoanTransfer ? undefined : toggleSplitMode
            }
            initialInputValue={initialCategoryName}
          />
        )}
      </div>
      <div className="transaction-cell" data-field="note">
        <TextInput
          value={draft.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="Note"
        />
      </div>
      <div className="transaction-cell" data-field="amount">
        <div className="amount-input-group">
          <button
            type="button"
            className={`sign-toggle ${
              draft.isExpense ? "sign-toggle-minus" : "sign-toggle-plus"
            }`}
            onClick={() => update({ isExpense: !draft.isExpense })}
          >
            {draft.isExpense ? "\u2212" : "+"}
          </button>
          <TextInput
            value={draft.amount}
            onChange={(e) => update({ amount: e.target.value })}
            placeholder="Amount"
            required
          />
        </div>
      </div>
      <div className="transaction-cell" data-field="tags">
        <TagCombobox
          tags={tags}
          selectedTagIds={draft.tagIds}
          onChange={(tagIds) => update({ tagIds })}
          onCreateTag={onCreateTag}
        />
      </div>
      <div className="transaction-cell">
        <div className="row-actions">
          <ClearingStatusToggle
            status={draft.clearingStatus}
            onToggle={() =>
              update({
                clearingStatus:
                  draft.clearingStatus === "UNCLEARED" ? "CLEARED" : "UNCLEARED",
              })
            }
          />
          <button
            type="submit"
            className="edit-icon-button button-success"
            disabled={isSaving}
            aria-label="Save transaction"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-button-danger"
            onClick={onCancel}
            aria-label="Cancel editing"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {hasSplits && (
        <SplitEditor
          splits={draft.splits}
          parentAmountMinor={parentAmountMinor}
          onSplitsChange={(splits: SplitDraft[]) => update({ splits })}
          payees={payees}
          accounts={accounts}
          categoryGroups={categoryGroups}
          onCreateCategory={onCreateCategory}
          isCreatingCategory={isCreatingCategory}
          tags={tags}
          onCreateTag={onCreateTag}
        />
      )}
    </form>
  )
}
