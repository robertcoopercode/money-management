import { useEffect, useMemo, useRef } from "react"
import { parseMoneyInputToMinor } from "@ledgr/shared"
import { AccountCombobox } from "./account-combobox.js"
import { PayeeAutocomplete, type PayeeOption } from "./payee-autocomplete.js"
import { CategoryAutocomplete } from "./category-autocomplete.js"
import { ClearedToggle } from "./cleared-toggle.js"
import { DatePicker } from "./date-picker.js"
import { SplitEditor } from "./split-editor.js"
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
  accounts: Array<{ id: string; name: string; type: string }>
  payees: Array<{ id: string; name: string }>
  categoryGroups: CategoryGroup[]
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  onCreatePayee?: (name: string) => Promise<{ id: string; name: string }>
  isCreatingPayee?: boolean
  onManagePayees?: () => void
  onCreateCategory?: (name: string) => Promise<{ id: string; name: string }>
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
  onManagePayees,
  onCreateCategory,
  isCreatingCategory = false,
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
      ),
    [draft.payeeId, draft.transferAccountId, accounts, payees, draft.accountId],
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
    const cells = formRef.current.querySelectorAll<HTMLElement>(
      ":scope > .transaction-cell",
    )
    const cell = cells[colIndex]
    if (!cell) return
    const input = cell.querySelector<HTMLElement>("input, button")
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
          },
          {
            categoryId: "",
            payeeId: "",
            note: "",
            amount: "",
            isExpense: draft.isExpense,
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
      <div className="transaction-cell" data-field="date">
        <DatePicker
          value={draft.date}
          onChange={(date) => update({ date })}
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
              update({ payeeId: selection.id, transferAccountId: "" })
            }
          }}
          onCreatePayee={onCreatePayee}
          isCreating={isCreatingPayee}
          onManagePayees={onManagePayees}
          initialInputValue={initialPayeeName}
        />
      </div>
      <div className="transaction-cell" data-field="category">
        {hasSplits ? (
          <div className="split-category-input-wrapper">
            <input
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
        ) : (
          <CategoryAutocomplete
            value={draft.categoryId}
            categoryGroups={categoryGroups}
            onChange={(categoryId) => update({ categoryId })}
            disabled={isTransfer && !isLoanTransfer}
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
            className={`sign-toggle ${
              draft.isExpense ? "sign-toggle-minus" : "sign-toggle-plus"
            }`}
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
        />
      )}
    </form>
  )
}
