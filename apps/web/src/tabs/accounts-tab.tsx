import { useState } from "react"
import { toast } from "sonner"
import { formatMoney } from "@ledgr/shared"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { useAccountMutations } from "../hooks/use-account-mutations.js"
import type { Account, LoanProfile } from "../types.js"
import type { UseQueryResult } from "@tanstack/react-query"

type AccountsTabProps = {
  accountsQuery: UseQueryResult<Account[]>
  refetchCoreData: () => void
  onAccountCreated: (accountId: string) => void
}

const emptyNewAccount = {
  name: "",
  type: "CASH" as Account["type"],
  startingBalance: "0",
  loanType: "MORTGAGE" as LoanProfile["loanType"],
  interestRate: "",
  minimumPayment: "",
}

export const AccountsTab = ({
  accountsQuery,
  refetchCoreData,
  onAccountCreated,
}: AccountsTabProps) => {
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] =
    useState(false)
  const [newAccount, setNewAccount] = useState(emptyNewAccount)
  const [editingAccountId, setEditingAccountId] = useState("")
  const [accountNameDrafts, setAccountNameDrafts] = useState<
    Record<string, string>
  >({})

  const clearAccountNameDraft = (accountId: string) => {
    setAccountNameDrafts((current) => {
      const next = { ...current }
      delete next[accountId]
      return next
    })
  }

  const {
    createAccountMutation,
    updateAccountNameMutation,
    deleteAccountMutation,
  } = useAccountMutations({
    refetchCoreData,
    onAccountCreated: (account) => {
      setIsCreateAccountDialogOpen(false)
      setNewAccount(emptyNewAccount)
      onAccountCreated(account.id)
    },
    onAccountNameUpdated: (accountId) => {
      setEditingAccountId("")
      clearAccountNameDraft(accountId)
    },
    onCreateReset: () => {},
  })

  return (
    <>
      <section className="card">
        <div className="section-header">
          <h2>Accounts</h2>
          <button
            type="button"
            className="icon-button"
            onClick={() => setIsCreateAccountDialogOpen(true)}
            aria-label="Create account"
            aria-haspopup="dialog"
            aria-expanded={isCreateAccountDialogOpen}
          >
            +
          </button>
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
          ) : (accountsQuery.data?.length ?? 0) === 0 ? (
            <p className="muted">
              No accounts yet. Add one to get started.
            </p>
          ) : (
            (accountsQuery.data ?? []).map((account) => {
              const displayBalance =
                account.type === "LOAN"
                  ? -account.balanceMinor
                  : account.balanceMinor
              return (
                <div className="list-item" key={account.id}>
                  <div className="account-item-main">
                    {editingAccountId === account.id ? (
                      <form
                        className="account-name-form"
                        onSubmit={(e) => {
                          e.preventDefault()
                          const nextName = (
                            accountNameDrafts[account.id] ?? account.name
                          ).trim()

                          if (!nextName) {
                            toast.error("Account name cannot be blank.")
                            return
                          }

                          if (nextName === account.name) {
                            setEditingAccountId("")
                            clearAccountNameDraft(account.id)
                            return
                          }

                          updateAccountNameMutation.mutate({
                            accountId: account.id,
                            name: nextName,
                          })
                        }}
                      >
                        <input
                          value={
                            accountNameDrafts[account.id] ?? account.name
                          }
                          onChange={(event) =>
                            setAccountNameDrafts((current) => ({
                              ...current,
                              [account.id]: event.target.value,
                            }))
                          }
                          aria-label={`Account name for ${account.name}`}
                          disabled={updateAccountNameMutation.isPending}
                        />
                      </form>
                    ) : (
                      <strong>{account.name}</strong>
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
                    {editingAccountId === account.id ? (
                      <>
                        <button
                          type="submit"
                          className="edit-icon-button button-success"
                          onClick={() => {
                            const nextName = (
                              accountNameDrafts[account.id] ?? account.name
                            ).trim()

                            if (!nextName) {
                              toast.error("Account name cannot be blank.")
                              return
                            }

                            if (nextName === account.name) {
                              setEditingAccountId("")
                              clearAccountNameDraft(account.id)
                              return
                            }

                            updateAccountNameMutation.mutate({
                              accountId: account.id,
                              name: nextName,
                            })
                          }}
                          disabled={updateAccountNameMutation.isPending}
                          aria-label="Save account name"
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
                          className="edit-icon-button button-danger"
                          onClick={() => {
                            setEditingAccountId("")
                            clearAccountNameDraft(account.id)
                          }}
                          disabled={updateAccountNameMutation.isPending}
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
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="edit-icon-button"
                          onClick={() => {
                            setEditingAccountId(account.id)
                            setAccountNameDrafts((current) => ({
                              ...current,
                              [account.id]: account.name,
                            }))
                          }}
                          disabled={updateAccountNameMutation.isPending}
                          aria-label={`Edit ${account.name}`}
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
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
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
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {isCreateAccountDialogOpen ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onClick={() => setIsCreateAccountDialogOpen(false)}
        >
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-header">
              <h2 id="create-account-dialog-title">Create account</h2>
              <button
                type="button"
                className="dialog-close-button"
                onClick={() => setIsCreateAccountDialogOpen(false)}
                aria-label="Close account dialog"
              >
                ×
              </button>
            </div>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault()
                createAccountMutation.mutate(newAccount)
              }}
            >
              <label>
                Name
                <input
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
                <select
                  value={newAccount.type}
                  onChange={(event) =>
                    setNewAccount((current) => ({
                      ...current,
                      type: event.target.value as Account["type"],
                    }))
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="CREDIT">Credit</option>
                  <option value="INVESTMENT">Investment</option>
                  <option value="LOAN">Loan</option>
                </select>
              </label>
              {newAccount.type === "LOAN" ? (
                <>
                  <label>
                    Loan Type
                    <select
                      value={newAccount.loanType}
                      onChange={(event) =>
                        setNewAccount((current) => ({
                          ...current,
                          loanType: event.target
                            .value as LoanProfile["loanType"],
                        }))
                      }
                    >
                      <option value="MORTGAGE">Mortgage</option>
                      <option value="AUTO">Auto</option>
                    </select>
                  </label>
                  <label>
                    Interest Rate (%)
                    <input
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
                    <input
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
                <input
                  value={newAccount.startingBalance}
                  onChange={(event) =>
                    setNewAccount((current) => ({
                      ...current,
                      startingBalance: event.target.value,
                    }))
                  }
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
          </div>
        </div>
      ) : null}
    </>
  )
}
