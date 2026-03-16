import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { parseMoneyInputToMinor } from "@ledgr/shared"
import { toast } from "sonner"
import { apiFetch, TRANSACTION_PAGE_SIZE } from "../lib/api.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import {
  buildNextTransactionDraft,
  transactionToEditDraft,
  derivePayeeSelection,
  getSplitBalanceStatus,
  type TransactionDraft,
  type EditableField,
} from "../lib/transaction-entry.js"
import { useTransactionMutations } from "../hooks/use-transaction-mutations.js"
import { useTagMutations } from "../hooks/use-tag-mutations.js"
import { useImportApprovalMutations } from "../hooks/use-import-approval-mutations.js"
import { useTransactionSelection } from "../hooks/use-transaction-selection.js"
import { useBulkTransactionMutations } from "../hooks/use-bulk-transaction-mutations.js"
import { AccountCombobox } from "../components/account-combobox.js"
import { AccountFilterSelect } from "../components/account-filter-select.js"
import { useLocalStorage } from "../hooks/use-local-storage.js"
import { CategoryAutocomplete } from "../components/category-autocomplete.js"
import { PayeeAutocomplete } from "../components/payee-autocomplete.js"
import { TagCombobox } from "../components/tag-combobox.js"
import { ClearingStatusToggle } from "../components/clearing-status-toggle.js"
import { AccountBalanceBar } from "../components/account-balance-bar.js"
import { ReconcileDialog } from "../components/reconcile-dialog.js"
import { CsvImportDialog } from "../components/csv-import-dialog.js"
import { ReconciledEditWarning } from "../components/reconciled-edit-warning.js"
import { useReconciliationMutation } from "../hooks/use-reconciliation-mutation.js"
import { DatePicker } from "../components/date-picker.js"
import { TransactionEditRow } from "../components/transaction-edit-row.js"
import { SplitEditor } from "../components/split-editor.js"
import { TransactionDisplayRow } from "../components/transaction-display-row.js"
import { TransactionContextMenu } from "../components/transaction-context-menu.js"
import { BulkActionBar } from "../components/bulk-action-bar.js"
import { buildDuplicateBody } from "../lib/build-duplicate-body.js"
import type {
  Transaction,
  Account,
  Payee,
  Tag,
  CategoryGroup,
  EditingTransaction,
} from "../types.js"

type TransactionsTabProps = {
  newTransaction: TransactionDraft
  setNewTransaction: React.Dispatch<React.SetStateAction<TransactionDraft>>
  accounts: Account[]
  payees: Payee[]
  tags: Tag[]
  categoryGroups: CategoryGroup[]
  refetchCoreData: () => void
  onNavigateToPayees: () => void
}

const DEFAULT_SORT_DIRS: Record<string, "asc" | "desc"> = {
  date: "desc",
  amountMinor: "desc",
  note: "asc",
  payee: "asc",
  category: "asc",
  account: "asc",
  clearingStatus: "asc",
}

export const TransactionsTab = ({
  newTransaction,
  setNewTransaction,
  accounts,
  payees,
  tags,
  categoryGroups,
  refetchCoreData,
  onNavigateToPayees,
}: TransactionsTabProps) => {
  const queryClient = useQueryClient()
  const dateRef = useRef<HTMLInputElement | null>(null)

  const [editingTransaction, setEditingTransaction] =
    useState<EditingTransaction | null>(null)
  const [expandedSplitIds, setExpandedSplitIds] = useState<Set<string>>(
    new Set(),
  )
  const [transactionOffset, setTransactionOffset] = useState(0)
  const [filterAccountId, setFilterAccountId] = useLocalStorage("ledgr:filter-account", "")
  const [sortBy, setSortBy] = useLocalStorage("ledgr:sort-by", "date")
  const [sortDir, setSortDir] = useLocalStorage<"asc" | "desc">("ledgr:sort-dir", "desc")
  const [showReconciled, setShowReconciled] = useState(false)

  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortDir(sortDir === "asc" ? "desc" : "asc")
      } else {
        setSortBy(column)
        setSortDir(DEFAULT_SORT_DIRS[column] ?? "asc")
      }
      setTransactionOffset(0)
    },
    [sortBy, sortDir, setSortBy, setSortDir],
  )

  const transactionsQuery = useQuery({
    queryKey: ["transactions", transactionOffset, filterAccountId, sortBy, sortDir, showReconciled],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(TRANSACTION_PAGE_SIZE),
        offset: String(transactionOffset),
        sortBy,
        sortDir,
      })
      if (filterAccountId) {
        params.set("accountId", filterAccountId)
      }
      if (showReconciled) {
        params.set("includeReconciled", "true")
      }
      return apiFetch<Transaction[]>(`/api/transactions?${params}`)
    },
  })

  const {
    createTransactionMutation,
    updateTransactionMutation,
    deleteTransactionMutation,
    createTransactionPayeeMutation,
    createCategoryMutation,
  } = useTransactionMutations({
    refetchCoreData,
    onTransactionCreated: () => {
      setNewTransaction((current) => buildNextTransactionDraft(current))
      window.setTimeout(() => dateRef.current?.focus(), 0)
    },
    onTransactionUpdated: () => {
      setEditingTransaction(null)
    },
  })

  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false)
  const [reconciledWarningOpen, setReconciledWarningOpen] = useState(false)
  const [pendingReconciledEdit, setPendingReconciledEdit] = useState<{
    transaction: Transaction
    field: EditableField
    splitIndex?: number
  } | null>(null)

  const { createTagMutation } = useTagMutations({ refetchCoreData })
  const { approveMutation, rejectMutation, unmatchMutation } = useImportApprovalMutations()
  const { reconcileMutation } = useReconciliationMutation({ refetchCoreData })

  const transactions = transactionsQuery.data ?? []
  const {
    selectedIds,
    toggleSelection,
    rangeSelect,
    toggleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useTransactionSelection(transactions)

  const { bulkApproveMutation, bulkRejectMutation, bulkDeleteMutation } =
    useBulkTransactionMutations({ onSuccess: clearSelection })

  useEffect(() => {
    clearSelection()
  }, [transactionOffset, filterAccountId, sortBy, sortDir, showReconciled, clearSelection])

  const payeeSelection = useMemo(
    () =>
      derivePayeeSelection(
        newTransaction.payeeId,
        newTransaction.transferAccountId,
        accounts,
        payees,
        newTransaction.accountId,
        newTransaction.isExpense,
      ),
    [
      newTransaction.payeeId,
      newTransaction.transferAccountId,
      accounts,
      payees,
      newTransaction.accountId,
      newTransaction.isExpense,
    ],
  )

  const isNewTransactionLoanTransfer = useMemo(() => {
    if (!newTransaction.transferAccountId) return false
    const sourceAccount = accounts.find(
      (a) => a.id === newTransaction.accountId,
    )
    const targetAccount = accounts.find(
      (a) => a.id === newTransaction.transferAccountId,
    )
    return sourceAccount?.type === "LOAN" || targetAccount?.type === "LOAN"
  }, [newTransaction.accountId, newTransaction.transferAccountId, accounts])

  const transactionsHasNextPage =
    (transactionsQuery.data?.length ?? 0) >= TRANSACTION_PAGE_SIZE

  const toggleSplitExpand = (transactionId: string) => {
    setExpandedSplitIds((prev) => {
      const next = new Set(prev)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }

  const startEditing = (
    transaction: Transaction,
    field: EditableField,
    splitIndex?: number,
  ) => {
    if (transaction.clearingStatus === "RECONCILED") {
      setPendingReconciledEdit({ transaction, field, splitIndex })
      setReconciledWarningOpen(true)
      return
    }
    clearSelection()
    setEditingTransaction({
      transactionId: transaction.id,
      draft: transactionToEditDraft(transaction),
      focusField: field,
      focusSplitIndex: splitIndex,
    })
  }

  const handleJumpToTransfer = useCallback(
    (transferPairId: string, sourceTransactionId: string) => {
      const partner = transactionsQuery.data?.find(
        (t) => t.transferPairId === transferPairId && t.id !== sourceTransactionId,
      )
      if (partner) {
        startEditing(partner, "payee")
      } else {
        toast.warning(
          "The linked transfer is not visible. It may be on a different page or filtered out.",
        )
      }
    },
    [transactionsQuery.data],
  )

  const handleSaveEdit = () => {
    if (!editingTransaction) return
    const { draft, transactionId } = editingTransaction
    const hasSplits = draft.splits.length > 0
    if (hasSplits) {
      const parentMinor = draft.isExpense
        ? -Math.abs(parseMoneyInputToMinor(draft.amount || "0"))
        : Math.abs(parseMoneyInputToMinor(draft.amount || "0"))
      const status = getSplitBalanceStatus(draft.splits, parentMinor)
      if (!status.isBalanced) {
        toast.error(`Split amounts don't add up. ${status.message}`)
        return
      }
    }
    updateTransactionMutation.mutate({
      transactionId,
      patch: {
        accountId: draft.accountId || undefined,
        transferAccountId: draft.transferAccountId || undefined,
        date: draft.date,
        amountMinor: draft.isExpense
          ? -Math.abs(parseMoneyInputToMinor(draft.amount))
          : Math.abs(parseMoneyInputToMinor(draft.amount)),
        payeeId: draft.payeeId || undefined,
        categoryId: hasSplits ? undefined : draft.categoryId || undefined,
        note: draft.note,
        clearingStatus: draft.clearingStatus,
        splits: hasSplits
          ? draft.splits.map((s) => ({
              categoryId: s.categoryId,
              payeeId: s.payeeId || undefined,
              note: s.note || undefined,
              amountMinor: s.isExpense
                ? -Math.abs(parseMoneyInputToMinor(s.amount))
                : Math.abs(parseMoneyInputToMinor(s.amount)),
              tagIds: s.tagIds,
            }))
          : [],
        tagIds: draft.tagIds,
      },
    })
  }

  const handleCreateTransaction = () => {
    const parentAmountMinor = newTransaction.isExpense
      ? -Math.abs(parseMoneyInputToMinor(newTransaction.amount))
      : Math.abs(parseMoneyInputToMinor(newTransaction.amount))
    const hasSplits = newTransaction.splits.length > 0

    createTransactionMutation.mutate({
      accountId: newTransaction.accountId,
      transferAccountId: newTransaction.transferAccountId || undefined,
      date: newTransaction.date,
      amountMinor: parentAmountMinor,
      payeeId: newTransaction.payeeId || undefined,
      categoryId: hasSplits
        ? undefined
        : newTransaction.categoryId || undefined,
      note: newTransaction.note || undefined,
      clearingStatus: newTransaction.clearingStatus,
      splits: hasSplits
        ? newTransaction.splits.map((s) => ({
            categoryId: s.categoryId,
            payeeId: s.payeeId || undefined,
            note: s.note || undefined,
            amountMinor: s.isExpense
              ? -Math.abs(parseMoneyInputToMinor(s.amount))
              : Math.abs(parseMoneyInputToMinor(s.amount)),
            tagIds: s.tagIds.length > 0 ? s.tagIds : undefined,
          }))
        : undefined,
      tagIds:
        newTransaction.tagIds.length > 0
          ? newTransaction.tagIds
          : undefined,
    })
  }

  return (
    <>
      <section className="card transaction-entry-card">
        <form
          className="transaction-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (newTransaction.splits.length > 0) {
              const parentMinor = newTransaction.isExpense
                ? -Math.abs(
                    parseMoneyInputToMinor(newTransaction.amount || "0"),
                  )
                : Math.abs(
                    parseMoneyInputToMinor(newTransaction.amount || "0"),
                  )
              const status = getSplitBalanceStatus(
                newTransaction.splits,
                parentMinor,
              )
              if (!status.isBalanced) {
                toast.error(`Split amounts don't add up. ${status.message}`)
                return
              }
            }
            handleCreateTransaction()
          }}
        >
          <AccountCombobox
            accounts={accounts}
            value={newTransaction.accountId}
            onChange={(accountId) =>
              setNewTransaction((current) => ({
                ...current,
                accountId,
              }))
            }
            placeholder="Select account"
          />
          <DatePicker
            ref={dateRef}
            value={newTransaction.date}
            onChange={(date) =>
              setNewTransaction((current) => ({
                ...current,
                date,
              }))
            }
            required
          />
          <PayeeAutocomplete
            payees={payees}
            accounts={accounts}
            currentAccountId={newTransaction.accountId}
            value={payeeSelection}
            onChange={(selection) => {
              setNewTransaction((current) => {
                if (!selection) {
                  return {
                    ...current,
                    payeeId: "",
                    transferAccountId: "",
                  }
                }
                if (selection.kind === "transfer") {
                  return {
                    ...current,
                    payeeId: "",
                    transferAccountId: selection.accountId,
                    ...(selection.isLoanPayment ? {} : { categoryId: "" }),
                  }
                }
                const selectedPayee = payees.find((p) => p.id === selection.id)
                return {
                  ...current,
                  payeeId: selection.id,
                  transferAccountId: "",
                  ...(selectedPayee?.defaultCategory
                    ? { categoryId: selectedPayee.defaultCategory.id }
                    : {}),
                }
              })
            }}
            onCreatePayee={async (name) => {
              const payee =
                await createTransactionPayeeMutation.mutateAsync({ name })
              await queryClient.invalidateQueries({ queryKey: ["payees"] })
              return payee
            }}
            isCreating={createTransactionPayeeMutation.isPending}
            isExpense={newTransaction.isExpense}
            onManagePayees={onNavigateToPayees}
          />
          {newTransaction.splits.length > 0 ? (
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
                onClick={() =>
                  setNewTransaction((current) => ({
                    ...current,
                    splits: [],
                    categoryId: "",
                  }))
                }
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
              value={newTransaction.categoryId}
              categoryGroups={categoryGroups}
              onChange={(categoryId) =>
                setNewTransaction((current) => ({
                  ...current,
                  categoryId,
                }))
              }
              disabled={
                Boolean(newTransaction.transferAccountId) &&
                !isNewTransactionLoanTransfer
              }
              onCreateCategory={({ name, groupName }) =>
                createCategoryMutation.mutateAsync({ name, groupName })
              }
              isCreating={createCategoryMutation.isPending}
              onSplit={
                newTransaction.transferAccountId &&
                !isNewTransactionLoanTransfer
                  ? undefined
                  : () =>
                      setNewTransaction((current) => ({
                        ...current,
                        splits: [
                          {
                            categoryId: current.categoryId,
                            payeeId: "",
                            note: "",
                            amount: "",
                            isExpense: current.isExpense,
                            tagIds: [],
                          },
                          {
                            categoryId: "",
                            payeeId: "",
                            note: "",
                            amount: "",
                            isExpense: current.isExpense,
                            tagIds: [],
                          },
                        ],
                        categoryId: "",
                      }))
              }
            />
          )}
          <input
            value={newTransaction.note}
            onChange={(event) =>
              setNewTransaction((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            placeholder="Note"
          />
          <div className="amount-input-group">
            <button
              type="button"
              className={`sign-toggle ${
                newTransaction.isExpense
                  ? "sign-toggle-minus"
                  : "sign-toggle-plus"
              }`}
              onClick={() =>
                setNewTransaction((current) => ({
                  ...current,
                  isExpense: !current.isExpense,
                }))
              }
            >
              {newTransaction.isExpense ? "\u2212" : "+"}
            </button>
            <input
              value={newTransaction.amount}
              onChange={(event) =>
                setNewTransaction((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
              placeholder="Amount"
              required
            />
          </div>
          <TagCombobox
            tags={tags}
            selectedTagIds={newTransaction.tagIds}
            onChange={(tagIds) =>
              setNewTransaction((current) => ({
                ...current,
                tagIds,
              }))
            }
            onCreateTag={(name) =>
              createTagMutation.mutateAsync({ name })
            }
          />
          <ClearingStatusToggle
            status={newTransaction.clearingStatus}
            onToggle={() =>
              setNewTransaction((current) => ({
                ...current,
                clearingStatus:
                  current.clearingStatus === "UNCLEARED" ? "CLEARED" : "UNCLEARED",
              }))
            }
          />
          <button
            type="submit"
            className="edit-icon-button button-success"
            disabled={createTransactionMutation.isPending}
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
          {newTransaction.splits.length > 0 && (
            <SplitEditor
              splits={newTransaction.splits}
              parentAmountMinor={
                newTransaction.isExpense
                  ? -Math.abs(
                      parseMoneyInputToMinor(newTransaction.amount || "0"),
                    )
                  : Math.abs(
                      parseMoneyInputToMinor(newTransaction.amount || "0"),
                    )
              }
              onSplitsChange={(splits) =>
                setNewTransaction((current) => ({ ...current, splits }))
              }
              payees={payees}
              accounts={accounts}
              categoryGroups={categoryGroups}
              onCreateCategory={({ name, groupName }) =>
                createCategoryMutation.mutateAsync({ name, groupName })
              }
              isCreatingCategory={createCategoryMutation.isPending}
              tags={tags}
              onCreateTag={(name) =>
                createTagMutation.mutateAsync({ name })
              }
            />
          )}
        </form>
      </section>

      <div className="transaction-filter-bar">
        <div className="filter-bar-row">
          <AccountFilterSelect
            accounts={accounts}
            value={filterAccountId}
            onChange={(value) => {
              setFilterAccountId(value)
              setTransactionOffset(0)
            }}
          />
          <button
            type="button"
            disabled={!filterAccountId}
            onClick={() => setCsvImportOpen(true)}
          >
            Import CSV
          </button>
          {filterAccountId && (
            <button
              type="button"
              className="filter-clear-button"
              onClick={() => {
                setFilterAccountId("")
                setTransactionOffset(0)
                setShowReconciled(false)
              }}
            >
              Clear filter
            </button>
          )}
        </div>
        {filterAccountId && (() => {
          const selectedAccount = accounts.find((a) => a.id === filterAccountId)
          return selectedAccount ? (
            <AccountBalanceBar
              account={selectedAccount}
              onReconcile={() => setReconcileDialogOpen(true)}
              showReconciled={showReconciled}
              onToggleShowReconciled={() => {
                setShowReconciled((v) => !v)
                setTransactionOffset(0)
              }}
            />
          ) : null
        })()}
      </div>

      <section className="card">
        <div className="table-wrap">
          <div className="transaction-list" role="table">
            <div className="transaction-header" role="row">
              <div className="transaction-cell transaction-cell-checkbox" role="columnheader">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={toggleSelectAll}
                  aria-label="Select all transactions"
                />
              </div>
              {([
                ["account", "Account"],
                ["date", "Date"],
                ["payee", "Payee"],
                ["category", "Category"],
                ["note", "Note"],
                ["amountMinor", "Amount"],
              ] as const).map(([column, label]) => (
                <div
                  key={column}
                  className={`transaction-cell sortable-header${sortBy === column ? " sorted" : ""}`}
                  role="columnheader"
                  tabIndex={0}
                  onClick={() => handleSort(column)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleSort(column)
                    }
                  }}
                >
                  {label}
                  {sortBy === column && (
                    <span className="sort-arrow" aria-hidden="true">
                      {sortDir === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </div>
              ))}
              <div className="transaction-cell" role="columnheader">Tags</div>
              <div className="transaction-cell" role="columnheader"></div>
            </div>
            {transactionsQuery.isError ? (
              <div className="transaction-list-full-row error-text">
                {toDisplayErrorMessage(
                  transactionsQuery.error,
                  "Failed to load transactions.",
                )}
              </div>
            ) : null}
            {transactionsQuery.isLoading ? (
              <div className="transaction-list-full-row muted">
                Loading transactions...
              </div>
            ) : (transactionsQuery.data?.length ?? 0) === 0 ? (
              <div className="transaction-list-full-row muted">
                No transactions in this account yet.
              </div>
            ) : (
              (transactionsQuery.data ?? []).map((transaction) =>
                editingTransaction?.transactionId === transaction.id ? (
                  <TransactionEditRow
                    key={transaction.id}
                    draft={editingTransaction.draft}
                    onDraftChange={(draft) =>
                      setEditingTransaction((prev) =>
                        prev ? { ...prev, draft } : null,
                      )
                    }
                    focusField={editingTransaction.focusField}
                    focusSplitIndex={editingTransaction.focusSplitIndex}
                    accounts={accounts}
                    payees={payees}
                    tags={tags}
                    categoryGroups={categoryGroups}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingTransaction(null)}
                    isSaving={updateTransactionMutation.isPending}
                    onCreatePayee={async (name) => {
                      const payee =
                        await createTransactionPayeeMutation.mutateAsync({
                          name,
                        })
                      await queryClient.invalidateQueries({
                        queryKey: ["payees"],
                      })
                      return payee
                    }}
                    isCreatingPayee={
                      createTransactionPayeeMutation.isPending
                    }
                    onManagePayees={onNavigateToPayees}
                    onCreateCategory={({ name, groupName }) =>
                      createCategoryMutation.mutateAsync({ name, groupName })
                    }
                    isCreatingCategory={createCategoryMutation.isPending}
                    onCreateTag={(name) =>
                      createTagMutation.mutateAsync({ name })
                    }
                  />
                ) : (
                  <TransactionContextMenu
                    key={transaction.id}
                    transaction={transaction}
                    onToggleClearingStatus={(id, clearingStatus) =>
                      updateTransactionMutation.mutate({
                        transactionId: id,
                        patch: { clearingStatus },
                      })
                    }
                    onDuplicate={(t) =>
                      createTransactionMutation.mutate(buildDuplicateBody(t))
                    }
                    onDelete={(id) =>
                      deleteTransactionMutation.mutate(id)
                    }
                  >
                    <TransactionDisplayRow
                      transaction={transaction}
                      tags={tags}
                      expandedSplitIds={expandedSplitIds}
                      onStartEditing={startEditing}
                      onJumpToTransfer={handleJumpToTransfer}
                      onToggleSplitExpand={toggleSplitExpand}
                      onClearingStatusChange={(id, clearingStatus) =>
                        updateTransactionMutation.mutate({
                          transactionId: id,
                          patch: { clearingStatus },
                        })
                      }
                      isUpdatePending={updateTransactionMutation.isPending && updateTransactionMutation.variables?.transactionId === transaction.id}
                      isSelected={selectedIds.has(transaction.id)}
                      onToggleSelect={(id, shiftKey) => {
                        if (shiftKey) {
                          rangeSelect(id)
                        } else {
                          toggleSelection(id)
                        }
                      }}
                      onApproveImport={(id) => approveMutation.mutate(id)}
                      onRejectImport={(id) => rejectMutation.mutate(id)}
                      onUnmatchImport={(id) => unmatchMutation.mutate(id)}
                    />
                  </TransactionContextMenu>
                ),
              )
            )}
          </div>
        </div>
        <nav className="pagination">
          <button
            type="button"
            className="pagination-button"
            onClick={() =>
              setTransactionOffset((current) =>
                Math.max(current - TRANSACTION_PAGE_SIZE, 0),
              )
            }
            disabled={
              transactionOffset === 0 || transactionsQuery.isLoading
            }
            aria-label="Previous page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="pagination-page">
            {Math.floor(transactionOffset / TRANSACTION_PAGE_SIZE) + 1}
          </span>
          <button
            type="button"
            className="pagination-button"
            onClick={() =>
              setTransactionOffset(
                (current) => current + TRANSACTION_PAGE_SIZE,
              )
            }
            disabled={
              !transactionsHasNextPage || transactionsQuery.isLoading
            }
            aria-label="Next page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </nav>
      </section>

      {filterAccountId && (() => {
        const selectedAccount = accounts.find((a) => a.id === filterAccountId)
        return selectedAccount ? (
          <ReconcileDialog
            open={reconcileDialogOpen}
            onOpenChange={setReconcileDialogOpen}
            clearedBalanceMinor={selectedAccount.clearedBalanceMinor}
            onConfirm={(statementBalanceMinor) => {
              reconcileMutation.mutate(
                { accountId: filterAccountId, statementBalanceMinor },
                { onSuccess: () => setReconcileDialogOpen(false) },
              )
            }}
            isPending={reconcileMutation.isPending}
          />
        ) : null
      })()}

      <ReconciledEditWarning
        open={reconciledWarningOpen}
        onOpenChange={setReconciledWarningOpen}
        onContinue={() => {
          if (pendingReconciledEdit) {
            clearSelection()
            setEditingTransaction({
              transactionId: pendingReconciledEdit.transaction.id,
              draft: transactionToEditDraft(pendingReconciledEdit.transaction),
              focusField: pendingReconciledEdit.field,
              focusSplitIndex: pendingReconciledEdit.splitIndex,
            })
            setPendingReconciledEdit(null)
          }
        }}
      />

      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        accountId={filterAccountId}
        refetchCoreData={refetchCoreData}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        hasPendingApproval={transactions
          .filter((t) => selectedIds.has(t.id))
          .some((t) => t.pendingApproval)}
        onApprove={() => {
          const ids = transactions
            .filter((t) => selectedIds.has(t.id) && t.pendingApproval)
            .map((t) => t.id)
          if (ids.length > 0) bulkApproveMutation.mutate(ids)
        }}
        onReject={() => {
          const ids = transactions
            .filter((t) => selectedIds.has(t.id) && t.pendingApproval)
            .map((t) => t.id)
          if (ids.length > 0) bulkRejectMutation.mutate(ids)
        }}
        onDelete={() => {
          const ids = [...selectedIds]
          if (ids.length > 0) bulkDeleteMutation.mutate(ids)
        }}
        onDismiss={clearSelection}
        isApproving={bulkApproveMutation.isPending}
        isRejecting={bulkRejectMutation.isPending}
        isDeleting={bulkDeleteMutation.isPending}
      />
    </>
  )
}
