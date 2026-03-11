import { useEffect, useMemo, useRef } from "react"
import { AccountCombobox } from "./account-combobox.js"
import {
  PayeeAutocomplete,
  type PayeeOption,
} from "./payee-autocomplete.js"
import { CategoryAutocomplete } from "./category-autocomplete.js"
import { ClearedToggle } from "./cleared-toggle.js"
import type { TransactionDraft, EditableField } from "../lib/transaction-entry.js"
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
  accounts: Array<{ id: string; name: string }>
  payees: Array<{ id: string; name: string }>
  categoryGroups: CategoryGroup[]
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  onCreatePayee?: (name: string) => void
  isCreatingPayee?: boolean
  onCreateCategory?: (name: string) => void
  isCreatingCategory?: boolean
}

const FIELD_TO_COLUMN: Record<EditableField, number> = {
  date: 0,
  account: 1,
  payee: 2,
  category: 3,
  note: 4,
  amount: 5,
  cleared: 7,
}

export const TransactionEditRow = ({
  draft,
  onDraftChange,
  focusField,
  accounts,
  payees,
  categoryGroups,
  onSave,
  onCancel,
  isSaving,
  onCreatePayee,
  isCreatingPayee = false,
  onCreateCategory,
  isCreatingCategory = false,
}: TransactionEditRowProps) => {
  const formRef = useRef<HTMLFormElement>(null)

  const payeeSelection = useMemo(
    (): PayeeOption | null =>
      derivePayeeSelection(draft.payeeId, draft.transferAccountId, accounts, payees),
    [draft.payeeId, draft.transferAccountId, accounts, payees],
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
    if (!focusField || !formRef.current) return
    const colIndex = FIELD_TO_COLUMN[focusField]
    const cells = formRef.current.querySelectorAll<HTMLElement>(":scope > .transaction-cell")
    const cell = cells[colIndex]
    if (!cell) return
    const input = cell.querySelector<HTMLElement>("input, button")
    input?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on mount
  }, [])

  const update = (patch: Partial<TransactionDraft>) =>
    onDraftChange({ ...draft, ...patch })

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
          onCancel()
          return
        }
        if (e.key === "Tab" && formRef.current) {
          const focusable = formRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
          )
          if (focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }}
      onBlur={(e) => {
        // Cancel when focus moves outside the form.
        // Use requestAnimationFrame so relatedTarget is set and portal
        // elements (combobox dropdowns) have time to claim focus.
        requestAnimationFrame(() => {
          if (
            formRef.current &&
            !formRef.current.contains(document.activeElement)
          ) {
            onCancel()
          }
        })
      }}
    >
      <div className="transaction-cell" data-field="date">
        <input
          type="date"
          value={draft.date}
          onChange={(e) => update({ date: e.target.value })}
          required
        />
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
              update({
                payeeId: "",
                transferAccountId: selection.accountId,
                categoryId: "",
              })
            } else {
              update({ payeeId: selection.id, transferAccountId: "" })
            }
          }}
          onCreatePayee={onCreatePayee}
          isCreating={isCreatingPayee}
          initialInputValue={initialPayeeName}
        />
      </div>
      <div className="transaction-cell" data-field="category">
        <CategoryAutocomplete
          value={draft.categoryId}
          categoryGroups={categoryGroups}
          onChange={(categoryId) => update({ categoryId })}
          disabled={Boolean(draft.transferAccountId)}
          onCreateCategory={onCreateCategory}
          isCreating={isCreatingCategory}
          initialInputValue={initialCategoryName}
        />
      </div>
      <div className="transaction-cell" data-field="note">
        <input
          value={draft.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="Note"
        />
      </div>
      <div className="transaction-cell" data-field="amount">
        <div className="amount-input-group">
          <button
            type="button"
            className={`sign-toggle ${draft.isExpense ? "sign-toggle-minus" : "sign-toggle-plus"}`}
            onClick={() => update({ isExpense: !draft.isExpense })}
          >
            {draft.isExpense ? "\u2212" : "+"}
          </button>
          <input
            value={draft.amount}
            onChange={(e) => update({ amount: e.target.value })}
            placeholder="Amount"
            required
          />
        </div>
      </div>
      <div className="transaction-cell" />
      <div className="transaction-cell">
        <div className="row-actions">
          <ClearedToggle
            pressed={draft.cleared}
            onPressedChange={(pressed) => update({ cleared: pressed })}
          />
          <button
            type="submit"
            className="edit-icon-button button-success"
            disabled={isSaving}
            aria-label="Save transaction"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </button>
          <button
            type="button"
            className="icon-button-danger"
            onClick={onCancel}
            aria-label="Cancel editing"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  )
}
