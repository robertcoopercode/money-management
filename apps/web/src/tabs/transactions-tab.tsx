import { Fragment, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { formatMoney, parseMoneyInputToMinor } from "@ledgr/shared"
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
import { AccountCombobox } from "../components/account-combobox.js"
import { CategoryAutocomplete } from "../components/category-autocomplete.js"
import { PayeeAutocomplete } from "../components/payee-autocomplete.js"
import { ClearedToggle } from "../components/cleared-toggle.js"
import { DatePicker } from "../components/date-picker.js"
import { TransactionEditRow } from "../components/transaction-edit-row.js"
import { SplitEditor } from "../components/split-editor.js"
import { TransactionBadge } from "../components/transaction-badge.js"
import type {
  Transaction,
  Account,
  Payee,
  CategoryGroup,
  EditingTransaction,
} from "../types.js"

type TransactionsTabProps = {
  newTransaction: TransactionDraft
  setNewTransaction: React.Dispatch<React.SetStateAction<TransactionDraft>>
  accounts: Account[]
  payees: Payee[]
  categoryGroups: CategoryGroup[]
  refetchCoreData: () => void
  onNavigateToPayees: () => void
}

export const TransactionsTab = ({
  newTransaction,
  setNewTransaction,
  accounts,
  payees,
  categoryGroups,
  refetchCoreData,
  onNavigateToPayees,
}: TransactionsTabProps) => {
  const queryClient = useQueryClient()
  const amountRef = useRef<HTMLInputElement | null>(null)

  const [editingTransaction, setEditingTransaction] =
    useState<EditingTransaction | null>(null)
  const [expandedSplitIds, setExpandedSplitIds] = useState<Set<string>>(
    new Set(),
  )
  const [transactionOffset, setTransactionOffset] = useState(0)

  const transactionsQuery = useQuery({
    queryKey: ["transactions", transactionOffset],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(TRANSACTION_PAGE_SIZE),
        offset: String(transactionOffset),
      })
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
      window.setTimeout(() => amountRef.current?.focus(), 0)
    },
    onTransactionUpdated: () => {
      setEditingTransaction(null)
    },
  })

  const payeeSelection = useMemo(
    () =>
      derivePayeeSelection(
        newTransaction.payeeId,
        newTransaction.transferAccountId,
        accounts,
        payees,
        newTransaction.accountId,
      ),
    [
      newTransaction.payeeId,
      newTransaction.transferAccountId,
      accounts,
      payees,
      newTransaction.accountId,
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
    setEditingTransaction({
      transactionId: transaction.id,
      draft: transactionToEditDraft(transaction),
      focusField: field,
      focusSplitIndex: splitIndex,
    })
  }

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
        cleared: draft.cleared,
        splits: hasSplits
          ? draft.splits.map((s) => ({
              categoryId: s.categoryId,
              payeeId: s.payeeId || undefined,
              note: s.note || undefined,
              amountMinor: s.isExpense
                ? -Math.abs(parseMoneyInputToMinor(s.amount))
                : Math.abs(parseMoneyInputToMinor(s.amount)),
            }))
          : [],
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
      cleared: newTransaction.cleared,
      splits: hasSplits
        ? newTransaction.splits.map((s) => ({
            categoryId: s.categoryId,
            payeeId: s.payeeId || undefined,
            note: s.note || undefined,
            amountMinor: s.isExpense
              ? -Math.abs(parseMoneyInputToMinor(s.amount))
              : Math.abs(parseMoneyInputToMinor(s.amount)),
          }))
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
            value={newTransaction.date}
            onChange={(date) =>
              setNewTransaction((current) => ({
                ...current,
                date,
              }))
            }
            required
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
              ref={amountRef}
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
                return {
                  ...current,
                  payeeId: selection.id,
                  transferAccountId: "",
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
              onCreateCategory={(name) =>
                createCategoryMutation.mutateAsync({ name })
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
                          },
                          {
                            categoryId: "",
                            payeeId: "",
                            note: "",
                            amount: "",
                            isExpense: current.isExpense,
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
          <ClearedToggle
            pressed={newTransaction.cleared}
            onPressedChange={(pressed) =>
              setNewTransaction((current) => ({
                ...current,
                cleared: pressed,
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
              onCreateCategory={(name) =>
                createCategoryMutation.mutateAsync({ name })
              }
              isCreatingCategory={createCategoryMutation.isPending}
            />
          )}
        </form>
      </section>

      <section className="card">
        <div className="table-wrap">
          <div className="transaction-list" role="table">
            <div className="transaction-header" role="row">
              <div className="transaction-cell" role="columnheader">
                Date
              </div>
              <div className="transaction-cell" role="columnheader">
                Account
              </div>
              <div className="transaction-cell" role="columnheader">
                Payee
              </div>
              <div className="transaction-cell" role="columnheader">
                Category
              </div>
              <div className="transaction-cell" role="columnheader">
                Note
              </div>
              <div className="transaction-cell" role="columnheader">
                Amount
              </div>
              <div className="transaction-cell" role="columnheader">
                Status
              </div>
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
                    onCreateCategory={(name) =>
                      createCategoryMutation.mutateAsync({ name })
                    }
                    isCreatingCategory={createCategoryMutation.isPending}
                  />
                ) : (
                  <Fragment key={transaction.id}>
                    <div className="transaction-row" role="row">
                      <div
                        className="transaction-cell clickable-cell"
                        role="cell"
                        tabIndex={0}
                        onClick={() => startEditing(transaction, "date")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            startEditing(transaction, "date")
                        }}
                      >
                        {new Date(transaction.date)
                          .toISOString()
                          .slice(0, 10)}
                      </div>
                      <div
                        className="transaction-cell clickable-cell"
                        role="cell"
                        tabIndex={0}
                        onClick={() => startEditing(transaction, "account")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            startEditing(transaction, "account")
                        }}
                      >
                        {transaction.account.name}
                      </div>
                      <div
                        className="transaction-cell clickable-cell"
                        role="cell"
                        tabIndex={0}
                        onClick={() => startEditing(transaction, "payee")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            startEditing(transaction, "payee")
                        }}
                      >
                        {transaction.isTransfer
                          ? (() => {
                              const targetName =
                                transaction.transferAccount?.name ?? "Account"
                              const isLoan =
                                transaction.transferAccount?.type === "LOAN" ||
                                transaction.account.type === "LOAN"
                              if (isLoan) {
                                return transaction.transferAccount?.type ===
                                  "LOAN"
                                  ? `Payment to ${targetName}`
                                  : `Payment from ${targetName}`
                              }
                              return targetName
                            })()
                          : (transaction.payee?.name ?? "\u2014")}
                      </div>
                      <div
                        className="transaction-cell clickable-cell"
                        role="cell"
                        tabIndex={0}
                        onClick={() =>
                          startEditing(transaction, "category")
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            startEditing(transaction, "category")
                        }}
                      >
                        {transaction.splits?.length > 0 ? (
                          <button
                            type="button"
                            className="split-chevron"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSplitExpand(transaction.id)
                            }}
                            aria-expanded={expandedSplitIds.has(
                              transaction.id,
                            )}
                            aria-label="Toggle split details"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={
                                expandedSplitIds.has(transaction.id)
                                  ? "split-chevron-expanded"
                                  : ""
                              }
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                            <em>Split transaction</em>
                          </button>
                        ) : transaction.isTransfer ? (
                          transaction.category?.name ? (
                            transaction.category.name
                          ) : (
                            (() => {
                              const isLoan =
                                transaction.transferAccount?.type === "LOAN" ||
                                transaction.account.type === "LOAN"
                              if (isLoan) {
                                return transaction.transferAccount?.type ===
                                  "LOAN"
                                  ? `Payment to ${transaction.transferAccount?.name ?? "Account"}`
                                  : `Payment from ${transaction.transferAccount?.name ?? "Account"}`
                              }
                              return `Transfer \u2192 ${transaction.transferAccount?.name ?? "Account"}`
                            })()
                          )
                        ) : (
                          (transaction.category?.name ?? "\u2014")
                        )}
                      </div>
                      <div
                        className="transaction-cell clickable-cell"
                        role="cell"
                        tabIndex={0}
                        onClick={() => startEditing(transaction, "note")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            startEditing(transaction, "note")
                        }}
                      >
                        {transaction.note || ""}
                      </div>
                      <div
                        className={`transaction-cell clickable-cell ${
                          transaction.amountMinor >= 0
                            ? "amount-inflow"
                            : "amount-outflow"
                        }`}
                        role="cell"
                        tabIndex={0}
                        onClick={() => startEditing(transaction, "amount")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            startEditing(transaction, "amount")
                        }}
                      >
                        {formatMoney(transaction.amountMinor)}
                      </div>
                      <div className="transaction-cell" role="cell">
                        <TransactionBadge transaction={transaction} />
                      </div>
                      <div className="transaction-cell" role="cell">
                        <div className="row-actions">
                          <ClearedToggle
                            pressed={transaction.cleared}
                            onPressedChange={(pressed) =>
                              updateTransactionMutation.mutate({
                                transactionId: transaction.id,
                                patch: { cleared: pressed },
                              })
                            }
                            disabled={updateTransactionMutation.isPending}
                          />
                          <button
                            type="button"
                            className="icon-button-danger"
                            onClick={() =>
                              deleteTransactionMutation.mutate(
                                transaction.id,
                              )
                            }
                            disabled={deleteTransactionMutation.isPending}
                            aria-label="Delete transaction"
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
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {expandedSplitIds.has(transaction.id) &&
                      transaction.splits?.length > 0 &&
                      transaction.splits.map((split, splitIndex) => (
                        <div
                          key={split.id}
                          className="split-detail-row"
                          role="row"
                        >
                          <div className="transaction-cell split-detail-leading" />
                          <div
                            className="transaction-cell clickable-cell split-detail-category"
                            tabIndex={0}
                            onClick={() =>
                              startEditing(
                                transaction,
                                "category",
                                splitIndex,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                startEditing(
                                  transaction,
                                  "category",
                                  splitIndex,
                                )
                            }}
                          >
                            {split.category.group.name}:{" "}
                            {split.category.name}
                          </div>
                          <div
                            className="transaction-cell clickable-cell split-detail-note"
                            tabIndex={0}
                            onClick={() =>
                              startEditing(transaction, "note", splitIndex)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                startEditing(
                                  transaction,
                                  "note",
                                  splitIndex,
                                )
                            }}
                          >
                            {split.note || ""}
                          </div>
                          <div
                            className={`transaction-cell clickable-cell split-detail-amount ${
                              split.amountMinor >= 0
                                ? "amount-inflow"
                                : "amount-outflow"
                            }`}
                            tabIndex={0}
                            onClick={() =>
                              startEditing(
                                transaction,
                                "amount",
                                splitIndex,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                startEditing(
                                  transaction,
                                  "amount",
                                  splitIndex,
                                )
                            }}
                          >
                            {formatMoney(split.amountMinor)}
                          </div>
                          <div className="transaction-cell split-detail-trailing" />
                        </div>
                      ))}
                  </Fragment>
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
    </>
  )
}
