import { useMemo, useState } from "react"
import { Switch } from "@base-ui/react/switch"
import { formatMoney, parseMoneyInputToMinor } from "@ledgr/shared"
import { TextInput } from "../components/text-input.js"
import { DatePicker } from "../components/date-picker.js"
import { AppSelect } from "../components/app-select.js"
import { AppDialog } from "../components/app-dialog.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { useAccountMutations } from "../hooks/use-account-mutations.js"
import { InlineEditName } from "../components/inline-edit-name.js"
import type { Account, LoanProfile } from "../types.js"
import type { UseQueryResult } from "@tanstack/react-query"

type AccountsTabProps = {
  accountsQuery: UseQueryResult<Account[]>
  refetchCoreData: () => void
  onAccountCreated: (accountId: string) => void
}

const todayString = () => new Date().toISOString().slice(0, 10)

const emptyNewAccount = {
  name: "",
  type: "CASH" as Account["type"],
  startingBalance: "0",
  startingBalanceAt: todayString(),
  loanType: "MORTGAGE" as LoanProfile["loanType"],
  interestRate: "",
  minimumPayment: "",
}

const formatMoneyForInput = (minor: number) => {
  const abs = Math.abs(minor)
  const sign = minor < 0 ? "-" : ""
  return `${sign}${(abs / 100).toFixed(2)}`
}

export const AccountsTab = ({
  accountsQuery,
  refetchCoreData,
  onAccountCreated,
}: AccountsTabProps) => {
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] =
    useState(false)
  const [newAccount, setNewAccount] = useState(emptyNewAccount)
  const [showInactive, setShowInactive] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editStartingBalance, setEditStartingBalance] = useState("")
  const [editStartingBalanceAt, setEditStartingBalanceAt] = useState("")
  const {
    createAccountMutation,
    updateAccountNameMutation,
    toggleAccountActiveMutation,
    updateStartingBalanceMutation,
    deleteAccountMutation,
  } = useAccountMutations({
    refetchCoreData,
    onAccountCreated: (account) => {
      setIsCreateAccountDialogOpen(false)
      setNewAccount(emptyNewAccount)
      onAccountCreated(account.id)
    },
    onAccountNameUpdated: () => {},
    onCreateReset: () => {},
  })

  const openEditModal = (account: Account) => {
    setEditingAccount(account)
    setEditStartingBalance(formatMoneyForInput(account.startingBalanceMinor))
    setEditStartingBalanceAt(account.startingBalanceAt.slice(0, 10))
  }

  const closeEditModal = () => {
    setEditingAccount(null)
  }

  const visibleAccounts = useMemo(() => {
    const all = accountsQuery.data ?? []
    if (showInactive) return all
    return all.filter((a) => a.isActive)
  }, [accountsQuery.data, showInactive])

  return (
    <>
      <section className="card">
        <div className="section-header">
          <h2>Accounts</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label className="app-switch-label">
              <Switch.Root
                className="app-switch"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              >
                <Switch.Thumb className="app-switch-thumb" />
              </Switch.Root>
              Show inactive
            </label>
            <button
              type="button"
              className="icon-button"
              onClick={() => setIsCreateAccountDialogOpen(true)}
              aria-label="Create account"
            >
              +
            </button>
          </div>
        </div>
        {accountsQuery.isError ? (
          <p className="error-text">
            {toDisplayErrorMessage(
              accountsQuery.error,
              "Failed to load accounts.",
            )}
          </p>
        ) : null}
        <div className="list" style={{ marginTop: "0.85rem" }}>
          {accountsQuery.isLoading ? (
            <p className="muted">Loading accounts...</p>
          ) : visibleAccounts.length === 0 ? (
            <p className="muted">
              {showInactive
                ? "No accounts yet. Add one to get started."
                : "No active accounts. Toggle \"Show inactive\" to see archived accounts."}
            </p>
          ) : (
            visibleAccounts.map((account) => {
              const displayBalance = account.balanceMinor
              return (
                <div
                  className="list-item"
                  key={account.id}
                  style={account.isActive ? undefined : { opacity: 0.5 }}
                >
                  <div className="account-item-main">
                    <InlineEditName
                      value={account.name}
                      onSave={(name) =>
                        updateAccountNameMutation.mutate({
                          accountId: account.id,
                          name,
                        })
                      }
                      isSaving={updateAccountNameMutation.isPending}
                      ariaLabel={`Account name for ${account.name}`}
                    />
                    {!account.isActive && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.05rem 0.35rem",
                          borderRadius: "4px",
                          background: "rgb(248 113 113 / 15%)",
                          color: "rgb(248 113 113)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          marginLeft: "0.35rem",
                        }}
                      >
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="account-item-meta">
                    <span className="muted">
                      {account.type.replaceAll("_", " ")}
                    </span>
                    <strong
                      className={
                        displayBalance < 0
                          ? "amount-negative"
                          : displayBalance > 0
                            ? "amount-positive"
                            : undefined
                      }
                    >
                      {formatMoney(displayBalance)}
                    </strong>
                    <button
                      type="button"
                      className="edit-icon-button"
                      title="Edit account"
                      onClick={() => openEditModal(account)}
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
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="edit-icon-button"
                      title={account.isActive ? "Mark inactive" : "Reactivate"}
                      onClick={() =>
                        toggleAccountActiveMutation.mutate({
                          accountId: account.id,
                          isActive: !account.isActive,
                        })
                      }
                      disabled={toggleAccountActiveMutation.isPending}
                    >
                      {account.isActive ? (
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
                          <path d="M18.36 6.64A9 9 0 0 1 20.77 15" />
                          <path d="M6.16 6.16a9 9 0 1 0 12.68 12.68" />
                          <path d="M12 2v4" />
                          <path d="m2 2 20 20" />
                        </svg>
                      ) : (
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
                          <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                          <path d="m9 11 3 3L22 4" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className="icon-button-danger"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete account "${account.name}"? This will archive the account and hide it from the list.`,
                          )
                        ) {
                          deleteAccountMutation.mutate(account.id)
                        }
                      }}
                      disabled={deleteAccountMutation.isPending}
                      aria-label={`Delete ${account.name}`}
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
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <AppDialog
        open={editingAccount !== null}
        onOpenChange={(open) => { if (!open) closeEditModal() }}
        title={editingAccount ? `Edit ${editingAccount.name}` : "Edit Account"}
      >
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            if (!editingAccount) return
            updateStartingBalanceMutation.mutate(
              {
                accountId: editingAccount.id,
                startingBalanceMinor: parseMoneyInputToMinor(editStartingBalance),
                startingBalanceAt: editStartingBalanceAt,
              },
              { onSuccess: closeEditModal },
            )
          }}
        >
          <label>
            Starting Balance
            <TextInput
              value={editStartingBalance}
              onChange={(event) =>
                setEditStartingBalance(event.target.value)
              }
            />
          </label>
          <label>
            Starting Balance Date
            <DatePicker
              value={editStartingBalanceAt}
              onChange={setEditStartingBalanceAt}
              required
            />
          </label>
          <div className="dialog-actions">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={updateStartingBalanceMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStartingBalanceMutation.isPending}
            >
              Save
            </button>
          </div>
        </form>
      </AppDialog>

      <AppDialog
        open={isCreateAccountDialogOpen}
        onOpenChange={setIsCreateAccountDialogOpen}
        title="Create account"
      >
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            createAccountMutation.mutate(newAccount)
          }}
        >
          <label>
            Name
            <TextInput
              value={newAccount.name}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>
          <label>
            Type
            <AppSelect
              options={[
                { value: "CASH", label: "Cash" },
                { value: "CREDIT", label: "Credit" },
                { value: "INVESTMENT", label: "Investment" },
                { value: "LOAN", label: "Loan" },
              ]}
              value={newAccount.type}
              onChange={(value) =>
                setNewAccount((current) => ({
                  ...current,
                  type: value as Account["type"],
                }))
              }
            />
          </label>
          {newAccount.type === "LOAN" ? (
            <>
              <label>
                Loan Type
                <AppSelect
                  options={[
                    { value: "MORTGAGE", label: "Mortgage" },
                    { value: "AUTO", label: "Auto" },
                  ]}
                  value={newAccount.loanType}
                  onChange={(value) =>
                    setNewAccount((current) => ({
                      ...current,
                      loanType: value as LoanProfile["loanType"],
                    }))
                  }
                />
              </label>
              <label>
                Interest Rate (%)
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newAccount.interestRate}
                  onChange={(event) =>
                    setNewAccount((current) => ({
                      ...current,
                      interestRate: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Minimum Payment
                <TextInput
                  value={newAccount.minimumPayment}
                  onChange={(event) =>
                    setNewAccount((current) => ({
                      ...current,
                      minimumPayment: event.target.value,
                    }))
                  }
                />
              </label>
            </>
          ) : null}
          <label>
            Starting Balance
            <TextInput
              value={newAccount.startingBalance}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  startingBalance: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Starting Balance Date
            <DatePicker
              value={newAccount.startingBalanceAt}
              onChange={(date) =>
                setNewAccount((current) => ({
                  ...current,
                  startingBalanceAt: date,
                }))
              }
              required
            />
          </label>
          <div className="dialog-actions">
            <button
              type="button"
              onClick={() => setIsCreateAccountDialogOpen(false)}
              disabled={createAccountMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAccountMutation.isPending}
            >
              Add Account
            </button>
          </div>
        </form>
      </AppDialog>
    </>
  )
}
