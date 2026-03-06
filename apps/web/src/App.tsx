import { useMemo, useRef, useState } from "react"
import { Tabs } from "@base-ui/react/tabs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ParentSize } from "@visx/responsive"
import {
  AnimatedAxis,
  AnimatedGrid,
  BarSeries,
  Tooltip,
  XYChart,
} from "@visx/xychart"
import { formatMoney, parseMoneyInputToMinor } from "@money/shared"
import { Toaster, toast } from "sonner"

import "./App.css"

type Account = {
  id: string
  name: string
  type: "CHEQUING" | "CREDIT_CARD" | "MORTGAGE"
  institution?: string | null
  startingBalanceMinor: number
  balanceMinor: number
}

type Payee = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
  groupId: string
}

type CategoryGroup = {
  id: string
  name: string
  categories: Category[]
}

type Transaction = {
  id: string
  date: string
  amountMinor: number
  note?: string | null
  cleared: boolean
  isTransfer: boolean
  transferAccountId?: string | null
  account: Account
  transferAccount?: Account | null
  payee?: Payee | null
  category?: Category | null
  origins: Array<{ originType: "MANUAL" | "CSV_IMPORT" }>
}

type PlanningCategory = {
  categoryId: string
  groupName: string
  categoryName: string
  assignedMinor: number
  activityMinor: number
  availableMinor: number
}

type PlanningResponse = {
  month: string
  readyToAssignMinor: number
  categories: PlanningCategory[]
}

type ReportingResponse = {
  spendingByCategory: Array<{
    categoryId: string
    categoryName: string
    groupName: string
    totalMinor: number
  }>
  incomeExpenseByMonth: Array<{
    month: string
    incomeMinor: number
    expenseMinor: number
  }>
}

type AssignmentMutationInput = {
  categoryId: string
  assignedMinor: number
}

type UpdateTransactionMutationInput = {
  transactionId: string
  patch: {
    cleared?: boolean
  }
}

const apiFetch = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || "Request failed.")
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

const formatMonth = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

const shiftMonth = (current: string, amount: number) => {
  const [yearPart, monthPart] = current.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return current
  }

  const date = new Date(Date.UTC(year, month - 1, 1))
  date.setUTCMonth(date.getUTCMonth() + amount)
  return formatMonth(date)
}

const defaultTransactionDate = new Date().toISOString().slice(0, 10)

const parseCsvFile = async (file: File) => {
  return file.text()
}

const TransactionBadge = ({ transaction }: { transaction: Transaction }) => {
  const isImported = transaction.origins.some(
    (origin) => origin.originType === "CSV_IMPORT",
  )
  const isMerged =
    isImported &&
    transaction.origins.some((origin) => origin.originType === "MANUAL") &&
    transaction.origins.length > 1

  return (
    <div className="badge-stack">
      {transaction.cleared ? (
        <span className="badge badge-cleared">Cleared</span>
      ) : null}
      {isImported ? (
        <span className="badge badge-imported">Imported</span>
      ) : null}
      {isMerged ? <span className="badge badge-merged">Matched</span> : null}
    </div>
  )
}

const App = () => {
  const queryClient = useQueryClient()
  const amountRef = useRef<HTMLInputElement | null>(null)

  const [month, setMonth] = useState(formatMonth(new Date()))
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null)
  const [importMapping, setImportMapping] = useState({
    date: "date",
    amount: "amount",
    payee: "payee",
    note: "note",
  })
  const [reportRange, setReportRange] = useState({
    fromDate: `${new Date().getUTCFullYear()}-01-01`,
    toDate: `${new Date().getUTCFullYear()}-12-31`,
  })
  const [reportFilters, setReportFilters] = useState({
    accountId: "",
    categoryId: "",
  })
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "CHEQUING" as Account["type"],
    institution: "",
    startingBalance: "0",
  })
  const [newPayee, setNewPayee] = useState("")
  const [selectedPayeeId, setSelectedPayeeId] = useState("")
  const [payeeMerge, setPayeeMerge] = useState({
    sourcePayeeId: "",
    targetPayeeId: "",
  })
  const [newTransaction, setNewTransaction] = useState({
    accountId: "",
    transferAccountId: "",
    date: defaultTransactionDate,
    amount: "",
    payeeId: "",
    categoryId: "",
    note: "",
    cleared: false,
  })
  const [mortgageInput, setMortgageInput] = useState({
    accountId: "",
    interestRateAnnual: "0.055",
    amortizationMonths: "300",
    principal: "450000",
    linkedCategoryId: "",
  })

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<Account[]>("/api/accounts"),
  })

  const payeesQuery = useQuery({
    queryKey: ["payees"],
    queryFn: () => apiFetch<Payee[]>("/api/payees"),
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryGroup[]>("/api/categories"),
  })

  const payeeTransactionsQuery = useQuery({
    queryKey: ["payee-transactions", selectedPayeeId],
    queryFn: () =>
      apiFetch<Transaction[]>(`/api/payees/${selectedPayeeId}/transactions`),
    enabled: Boolean(selectedPayeeId),
  })

  const transactionsQuery = useQuery({
    queryKey: ["transactions", newTransaction.accountId],
    queryFn: () =>
      apiFetch<Transaction[]>(
        `/api/transactions?limit=200&accountId=${newTransaction.accountId}`,
      ),
    enabled: Boolean(newTransaction.accountId),
  })

  const planningQuery = useQuery({
    queryKey: ["planning", month],
    queryFn: () => apiFetch<PlanningResponse>(`/api/planning/${month}`),
  })

  const reportingQuery = useQuery({
    queryKey: ["reports", reportRange, reportFilters],
    queryFn: () => {
      const query = new URLSearchParams({
        fromDate: reportRange.fromDate,
        toDate: reportRange.toDate,
      })

      if (reportFilters.accountId) {
        query.set("accountIds", reportFilters.accountId)
      }

      if (reportFilters.categoryId) {
        query.set("categoryIds", reportFilters.categoryId)
      }

      return apiFetch<ReportingResponse>(`/api/reports?${query.toString()}`)
    },
  })

  const mortgageQuery = useQuery({
    queryKey: ["mortgage", mortgageInput.accountId],
    queryFn: () =>
      apiFetch<{
        monthlyPaymentMinor: number
        principalMinor: number
        amortizationMonths: number
      }>(`/api/mortgages/${mortgageInput.accountId}`),
    enabled: Boolean(mortgageInput.accountId),
  })

  const refetchCoreData = () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
    void queryClient.invalidateQueries({ queryKey: ["payees"] })
    void queryClient.invalidateQueries({ queryKey: ["planning"] })
    void queryClient.invalidateQueries({ queryKey: ["reports"] })
  }

  const createAccountMutation = useMutation({
    mutationFn: () =>
      apiFetch<Account>("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: newAccount.name,
          type: newAccount.type,
          institution: newAccount.institution || undefined,
          startingBalanceMinor: parseMoneyInputToMinor(
            newAccount.startingBalance,
          ),
        }),
      }),
    onSuccess: (account) => {
      toast.success("Account created")
      setNewAccount({
        name: "",
        type: "CHEQUING",
        institution: "",
        startingBalance: "0",
      })
      setNewTransaction((current) => ({
        ...current,
        accountId: current.accountId || account.id,
      }))
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`)
    },
  })

  const createPayeeMutation = useMutation({
    mutationFn: () =>
      apiFetch<Payee>("/api/payees", {
        method: "POST",
        body: JSON.stringify({ name: newPayee }),
      }),
    onSuccess: () => {
      toast.success("Payee created")
      setNewPayee("")
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to add payee: ${error.message}`)
    },
  })

  const mergePayeeMutation = useMutation({
    mutationFn: () =>
      apiFetch<Payee>("/api/payees/merge", {
        method: "POST",
        body: JSON.stringify(payeeMerge),
      }),
    onSuccess: () => {
      toast.success("Payees merged")
      setPayeeMerge({ sourcePayeeId: "", targetPayeeId: "" })
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to merge payees: ${error.message}`)
    },
  })

  const createTransactionMutation = useMutation({
    mutationFn: () =>
      apiFetch<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: newTransaction.accountId,
          transferAccountId: newTransaction.transferAccountId || undefined,
          date: newTransaction.date,
          amountMinor: parseMoneyInputToMinor(newTransaction.amount),
          payeeId: newTransaction.payeeId || undefined,
          categoryId: newTransaction.categoryId || undefined,
          note: newTransaction.note || undefined,
          cleared: newTransaction.cleared,
        }),
      }),
    onSuccess: () => {
      toast.success("Transaction saved")
      setNewTransaction((current) => ({
        ...current,
        amount: "",
        note: "",
        payeeId: "",
        categoryId: "",
        cleared: false,
      }))
      refetchCoreData()
      window.setTimeout(() => amountRef.current?.focus(), 0)
    },
    onError: (error) => {
      toast.error(`Unable to create transaction: ${error.message}`)
    },
  })

  const updateTransactionMutation = useMutation({
    mutationFn: ({ transactionId, patch }: UpdateTransactionMutationInput) =>
      apiFetch<Transaction>(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      toast.success("Transaction updated")
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update transaction: ${error.message}`)
    },
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (transactionId: string) =>
      apiFetch<void>(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Transaction deleted")
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete transaction: ${error.message}`)
    },
  })

  const assignMutation = useMutation({
    mutationFn: (input: AssignmentMutationInput) =>
      apiFetch("/api/planning/assignments", {
        method: "POST",
        body: JSON.stringify({
          month,
          categoryId: input.categoryId,
          assignedMinor: input.assignedMinor,
        }),
      }),
    onSuccess: () => {
      toast.success("Category assignment updated")
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update assignment: ${error.message}`)
    },
  })

  const uploadCsvMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCsvFile || !newTransaction.accountId) {
        throw new Error("Select a CSV file and account first.")
      }

      const csvText = await parseCsvFile(selectedCsvFile)
      return apiFetch<{
        rowsTotal: number
        rowsMatched: number
        rowsCreated: number
      }>("/api/imports/csv", {
        method: "POST",
        body: JSON.stringify({
          accountId: newTransaction.accountId,
          fileName: selectedCsvFile.name,
          csvText,
          mapping: importMapping,
        }),
      })
    },
    onSuccess: (result) => {
      toast.success(
        `Imported ${result.rowsTotal} rows (${result.rowsMatched} matched).`,
      )
      setSelectedCsvFile(null)
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
    },
  })

  const saveMortgageMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/mortgages", {
        method: "POST",
        body: JSON.stringify({
          accountId: mortgageInput.accountId,
          interestRateAnnual: Number(mortgageInput.interestRateAnnual),
          amortizationMonths: Number(mortgageInput.amortizationMonths),
          principalMinor: parseMoneyInputToMinor(mortgageInput.principal),
          linkedCategoryId: mortgageInput.linkedCategoryId || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Mortgage profile saved")
      void queryClient.invalidateQueries({ queryKey: ["mortgage"] })
    },
    onError: (error) => {
      toast.error(`Unable to save mortgage profile: ${error.message}`)
    },
  })

  const groupedPlanningRows = useMemo(() => {
    const groups = new Map<string, PlanningCategory[]>()
    for (const category of planningQuery.data?.categories ?? []) {
      groups.set(category.groupName, [
        ...(groups.get(category.groupName) ?? []),
        category,
      ])
    }
    return [...groups.entries()]
  }, [planningQuery.data])

  const spendingChartData =
    reportingQuery.data?.incomeExpenseByMonth.map((item) => ({
      month: item.month,
      expense: Number((item.expenseMinor / 100).toFixed(2)),
    })) ?? []

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Money Management</h1>
          <p className="subtitle">
            YNAB-inspired budgeting with keyboard-first transaction entry.
          </p>
        </div>
        <div className="ready-to-assign-card">
          <span>Ready to Assign</span>
          <strong>
            {formatMoney(planningQuery.data?.readyToAssignMinor ?? 0)}
          </strong>
        </div>
      </header>

      <Tabs.Root className="tabs-root" defaultValue="accounts">
        <Tabs.List className="tabs-list">
          <Tabs.Tab className="tabs-tab" value="accounts">
            Accounts & Transactions
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="payees">
            Payees
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="imports">
            CSV Import
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="planning">
            Planning
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="reports">
            Reporting
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="mortgage">
            Mortgage
          </Tabs.Tab>
          <Tabs.Indicator className="tabs-indicator" />
        </Tabs.List>

        <Tabs.Panel className="panel" value="accounts">
          <section className="grid-two">
            <article className="card">
              <h2>Create account</h2>
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault()
                  createAccountMutation.mutate()
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
                    <option value="CHEQUING">Chequing</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="MORTGAGE">Mortgage</option>
                  </select>
                </label>
                <label>
                  Institution
                  <input
                    value={newAccount.institution}
                    onChange={(event) =>
                      setNewAccount((current) => ({
                        ...current,
                        institution: event.target.value,
                      }))
                    }
                  />
                </label>
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
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                >
                  Add Account
                </button>
              </form>
            </article>

            <article className="card">
              <h2>Accounts</h2>
              <div className="list">
                {accountsQuery.isLoading ? (
                  <p className="muted">Loading accounts...</p>
                ) : (accountsQuery.data?.length ?? 0) === 0 ? (
                  <p className="muted">
                    No accounts yet. Add one to get started.
                  </p>
                ) : (
                  (accountsQuery.data ?? []).map((account) => (
                    <div className="list-item" key={account.id}>
                      <div>
                        <strong>{account.name}</strong>
                        <p className="muted">
                          {account.type.replaceAll("_", " ")} ·{" "}
                          {account.institution ?? "No institution"}
                        </p>
                      </div>
                      <strong>{formatMoney(account.balanceMinor)}</strong>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="card">
            <h2>Quick transaction entry (Enter to save, auto-focus next)</h2>
            <form
              className="transaction-form"
              onSubmit={(event) => {
                event.preventDefault()
                createTransactionMutation.mutate()
              }}
            >
              <select
                value={newTransaction.accountId}
                onChange={(event) =>
                  setNewTransaction((current) => ({
                    ...current,
                    accountId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select account</option>
                {(accountsQuery.data ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <select
                value={newTransaction.transferAccountId}
                onChange={(event) =>
                  setNewTransaction((current) => ({
                    ...current,
                    transferAccountId: event.target.value,
                    categoryId: event.target.value ? "" : current.categoryId,
                  }))
                }
              >
                <option value="">Not a transfer</option>
                {(accountsQuery.data ?? [])
                  .filter((account) => account.id !== newTransaction.accountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      Transfer with {account.name}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(event) =>
                  setNewTransaction((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                required
              />
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
              <select
                value={newTransaction.payeeId}
                onChange={(event) =>
                  setNewTransaction((current) => ({
                    ...current,
                    payeeId: event.target.value,
                  }))
                }
              >
                <option value="">Payee</option>
                {(payeesQuery.data ?? []).map((payee) => (
                  <option key={payee.id} value={payee.id}>
                    {payee.name}
                  </option>
                ))}
              </select>
              <select
                value={newTransaction.categoryId}
                onChange={(event) =>
                  setNewTransaction((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                disabled={Boolean(newTransaction.transferAccountId)}
              >
                <option value="">Category</option>
                {(categoriesQuery.data ?? []).flatMap((group) =>
                  group.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {group.name} · {category.name}
                    </option>
                  )),
                )}
              </select>
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
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={newTransaction.cleared}
                  onChange={(event) =>
                    setNewTransaction((current) => ({
                      ...current,
                      cleared: event.target.checked,
                    }))
                  }
                />
                Cleared
              </label>
              <button
                type="submit"
                disabled={createTransactionMutation.isPending}
              >
                Save
              </button>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Payee</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsQuery.isLoading ? (
                    <tr>
                      <td colSpan={8} className="muted">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : (transactionsQuery.data?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={8} className="muted">
                        No transactions in this account yet.
                      </td>
                    </tr>
                  ) : (
                    (transactionsQuery.data ?? []).map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          {new Date(transaction.date)
                            .toISOString()
                            .slice(0, 10)}
                        </td>
                        <td>{transaction.account.name}</td>
                        <td>{transaction.payee?.name ?? "—"}</td>
                        <td>
                          {transaction.isTransfer
                            ? `Transfer → ${
                                transaction.transferAccount?.name ?? "Account"
                              }`
                            : (transaction.category?.name ?? "—")}
                        </td>
                        <td>{transaction.note ?? "—"}</td>
                        <td
                          className={
                            transaction.amountMinor >= 0
                              ? "amount-inflow"
                              : "amount-outflow"
                          }
                        >
                          {formatMoney(transaction.amountMinor)}
                        </td>
                        <td>
                          <TransactionBadge transaction={transaction} />
                        </td>
                        <td>
                          <div className="row-actions">
                            <label className="checkbox-inline">
                              <input
                                type="checkbox"
                                checked={transaction.cleared}
                                onChange={() =>
                                  updateTransactionMutation.mutate({
                                    transactionId: transaction.id,
                                    patch: { cleared: !transaction.cleared },
                                  })
                                }
                                disabled={updateTransactionMutation.isPending}
                              />
                              Cleared
                            </label>
                            <button
                              type="button"
                              className="button-danger"
                              onClick={() =>
                                deleteTransactionMutation.mutate(transaction.id)
                              }
                              disabled={deleteTransactionMutation.isPending}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="payees">
          <section className="grid-two">
            <article className="card">
              <h2>Add payee</h2>
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault()
                  createPayeeMutation.mutate()
                }}
              >
                <label>
                  Name
                  <input
                    value={newPayee}
                    onChange={(event) => setNewPayee(event.target.value)}
                    required
                  />
                </label>
                <button type="submit">Create Payee</button>
              </form>
            </article>
            <article className="card">
              <h2>Merge duplicate payees</h2>
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault()
                  mergePayeeMutation.mutate()
                }}
              >
                <label>
                  Source (duplicate)
                  <select
                    value={payeeMerge.sourcePayeeId}
                    onChange={(event) =>
                      setPayeeMerge((current) => ({
                        ...current,
                        sourcePayeeId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select payee</option>
                    {(payeesQuery.data ?? []).map((payee) => (
                      <option key={payee.id} value={payee.id}>
                        {payee.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Target (keep)
                  <select
                    value={payeeMerge.targetPayeeId}
                    onChange={(event) =>
                      setPayeeMerge((current) => ({
                        ...current,
                        targetPayeeId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select payee</option>
                    {(payeesQuery.data ?? []).map((payee) => (
                      <option key={payee.id} value={payee.id}>
                        {payee.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">Merge Payees</button>
              </form>
            </article>
          </section>

          <section className="card">
            <h2>Payees</h2>
            <div className="inline-controls" style={{ marginBottom: "0.8rem" }}>
              <label>
                Inspect transactions
                <select
                  value={selectedPayeeId}
                  onChange={(event) => setSelectedPayeeId(event.target.value)}
                >
                  <option value="">Select payee</option>
                  {(payeesQuery.data ?? []).map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="list">
              {payeesQuery.isLoading ? (
                <p className="muted">Loading payees...</p>
              ) : (payeesQuery.data?.length ?? 0) === 0 ? (
                <p className="muted">No payees yet.</p>
              ) : (
                (payeesQuery.data ?? []).map((payee) => (
                  <div className="list-item" key={payee.id}>
                    <strong>{payee.name}</strong>
                    <span className="muted">ID: {payee.id}</span>
                  </div>
                ))
              )}
            </div>

            {selectedPayeeId ? (
              <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account</th>
                      <th>Category</th>
                      <th>Note</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payeeTransactionsQuery.isLoading ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          Loading payee transactions...
                        </td>
                      </tr>
                    ) : (payeeTransactionsQuery.data?.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          No transactions for selected payee.
                        </td>
                      </tr>
                    ) : (
                      (payeeTransactionsQuery.data ?? []).map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            {new Date(transaction.date)
                              .toISOString()
                              .slice(0, 10)}
                          </td>
                          <td>{transaction.account.name}</td>
                          <td>
                            {transaction.isTransfer
                              ? `Transfer → ${
                                  transaction.transferAccount?.name ?? "Account"
                                }`
                              : (transaction.category?.name ?? "—")}
                          </td>
                          <td>{transaction.note ?? "—"}</td>
                          <td
                            className={
                              transaction.amountMinor >= 0
                                ? "amount-inflow"
                                : "amount-outflow"
                            }
                          >
                            {formatMoney(transaction.amountMinor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="imports">
          <section className="card">
            <h2>CSV Import</h2>
            <p className="muted">
              CSV columns expected by default:{" "}
              <code>date,amount,payee,note</code>. Matching uses exact amount
              and ±3 day date window.
            </p>
            <div className="transaction-form">
              <input
                value={importMapping.date}
                onChange={(event) =>
                  setImportMapping((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                placeholder="Date column"
              />
              <input
                value={importMapping.amount}
                onChange={(event) =>
                  setImportMapping((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="Amount column"
              />
              <input
                value={importMapping.payee}
                onChange={(event) =>
                  setImportMapping((current) => ({
                    ...current,
                    payee: event.target.value,
                  }))
                }
                placeholder="Payee column"
              />
              <input
                value={importMapping.note}
                onChange={(event) =>
                  setImportMapping((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Note column"
              />
            </div>
            <div className="transaction-form">
              <select
                value={newTransaction.accountId}
                onChange={(event) =>
                  setNewTransaction((current) => ({
                    ...current,
                    accountId: event.target.value,
                  }))
                }
              >
                <option value="">Select account</option>
                {(accountsQuery.data ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) =>
                  setSelectedCsvFile(event.target.files?.[0] ?? null)
                }
              />
              <button
                type="button"
                disabled={!selectedCsvFile || uploadCsvMutation.isPending}
                onClick={() => uploadCsvMutation.mutate()}
              >
                Import CSV
              </button>
            </div>
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="planning">
          <section className="card">
            <div className="planning-header">
              <h2>Planning · {month}</h2>
              <div className="inline-controls">
                <button
                  type="button"
                  onClick={() => setMonth((current) => shiftMonth(current, -1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setMonth((current) => shiftMonth(current, 1))}
                >
                  Next
                </button>
              </div>
            </div>
            <p className="muted">
              Ready to Assign:{" "}
              {formatMoney(planningQuery.data?.readyToAssignMinor ?? 0)}
            </p>

            {planningQuery.isLoading ? (
              <p className="muted">Loading planning data...</p>
            ) : groupedPlanningRows.length === 0 ? (
              <p className="muted">
                No planning categories available yet. Run database seed data.
              </p>
            ) : (
              groupedPlanningRows.map(([groupName, rows]) => (
                <div className="planning-group" key={groupName}>
                  <h3>{groupName}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Assigned</th>
                        <th>Activity</th>
                        <th>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.categoryId}>
                          <td>{row.categoryName}</td>
                          <td>
                            <input
                              className="small-input"
                              defaultValue={(
                                row.assignedMinor / 100
                              ).toString()}
                              onBlur={(event) =>
                                assignMutation.mutate({
                                  categoryId: row.categoryId,
                                  assignedMinor: parseMoneyInputToMinor(
                                    event.target.value,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td>{formatMoney(row.activityMinor)}</td>
                          <td>{formatMoney(row.availableMinor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="reports">
          <section className="card">
            <h2>Reporting</h2>
            <div className="inline-controls">
              <label>
                From
                <input
                  type="date"
                  value={reportRange.fromDate}
                  onChange={(event) =>
                    setReportRange((current) => ({
                      ...current,
                      fromDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={reportRange.toDate}
                  onChange={(event) =>
                    setReportRange((current) => ({
                      ...current,
                      toDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Account
                <select
                  value={reportFilters.accountId}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      accountId: event.target.value,
                    }))
                  }
                >
                  <option value="">All accounts</option>
                  {(accountsQuery.data ?? []).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select
                  value={reportFilters.categoryId}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">All categories</option>
                  {(categoriesQuery.data ?? []).flatMap((group) =>
                    group.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {group.name} · {category.name}
                      </option>
                    )),
                  )}
                </select>
              </label>
            </div>

            <div className="chart-card">
              {reportingQuery.isLoading ? (
                <p className="muted">Loading chart data...</p>
              ) : spendingChartData.length === 0 ? (
                <p className="muted">No reporting data for selected filters.</p>
              ) : (
                <ParentSize>
                  {({ width }) => (
                    <XYChart
                      height={320}
                      width={width}
                      xScale={{ type: "band" }}
                      yScale={{ type: "linear", nice: true }}
                    >
                      <AnimatedAxis orientation="bottom" />
                      <AnimatedAxis orientation="left" />
                      <AnimatedGrid columns={false} numTicks={4} />
                      <BarSeries
                        dataKey="Spending"
                        data={spendingChartData}
                        xAccessor={(d) => d.month}
                        yAccessor={(d) => d.expense}
                      />
                      <Tooltip
                        renderTooltip={({ tooltipData }) => {
                          const datum = tooltipData?.nearestDatum?.datum as {
                            month: string
                            expense: number
                          } | undefined

                          if (!datum) {
                            return null
                          }

                          return (
                            <div className="tooltip">
                              <strong>{datum.month}</strong>
                              <div>
                                {formatMoney(Math.round(datum.expense * 100))}
                              </div>
                            </div>
                          )
                        }}
                      />
                    </XYChart>
                  )}
                </ParentSize>
              )}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expense</th>
                  </tr>
                </thead>
                <tbody>
                  {reportingQuery.isLoading ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        Loading report table...
                      </td>
                    </tr>
                  ) : (reportingQuery.data?.incomeExpenseByMonth.length ??
                      0) === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        No monthly data for selected filters.
                      </td>
                    </tr>
                  ) : (
                    (reportingQuery.data?.incomeExpenseByMonth ?? []).map(
                      (item) => (
                        <tr key={item.month}>
                          <td>{item.month}</td>
                          <td className="amount-inflow">
                            {formatMoney(item.incomeMinor)}
                          </td>
                          <td className="amount-outflow">
                            {formatMoney(-item.expenseMinor)}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Category</th>
                    <th>Total Spending</th>
                  </tr>
                </thead>
                <tbody>
                  {reportingQuery.isLoading ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        Loading spending breakdown...
                      </td>
                    </tr>
                  ) : (reportingQuery.data?.spendingByCategory.length ?? 0) ===
                    0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        No category spending breakdown for selected filters.
                      </td>
                    </tr>
                  ) : (
                    (reportingQuery.data?.spendingByCategory ?? []).map(
                      (item) => (
                        <tr key={item.categoryId}>
                          <td>{item.groupName}</td>
                          <td>{item.categoryName}</td>
                          <td className="amount-outflow">
                            {formatMoney(-item.totalMinor)}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="mortgage">
          <section className="grid-two">
            <article className="card">
              <h2>Mortgage profile</h2>
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault()
                  saveMortgageMutation.mutate()
                }}
              >
                <label>
                  Mortgage account
                  <select
                    value={mortgageInput.accountId}
                    onChange={(event) =>
                      setMortgageInput((current) => ({
                        ...current,
                        accountId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select account</option>
                    {(accountsQuery.data ?? [])
                      .filter((account) => account.type === "MORTGAGE")
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Interest rate (annual decimal)
                  <input
                    value={mortgageInput.interestRateAnnual}
                    onChange={(event) =>
                      setMortgageInput((current) => ({
                        ...current,
                        interestRateAnnual: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Amortization (months)
                  <input
                    value={mortgageInput.amortizationMonths}
                    onChange={(event) =>
                      setMortgageInput((current) => ({
                        ...current,
                        amortizationMonths: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Principal
                  <input
                    value={mortgageInput.principal}
                    onChange={(event) =>
                      setMortgageInput((current) => ({
                        ...current,
                        principal: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Linked category
                  <select
                    value={mortgageInput.linkedCategoryId}
                    onChange={(event) =>
                      setMortgageInput((current) => ({
                        ...current,
                        linkedCategoryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Unlinked</option>
                    {(categoriesQuery.data ?? []).flatMap((group) =>
                      group.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {group.name} · {category.name}
                        </option>
                      )),
                    )}
                  </select>
                </label>
                <button type="submit">Save Mortgage Profile</button>
              </form>
            </article>
            <article className="card">
              <h2>Mortgage summary</h2>
              {mortgageQuery.isLoading ? (
                <p className="muted">Loading mortgage profile...</p>
              ) : mortgageQuery.data ? (
                <div className="summary-block">
                  <div className="summary-row">
                    <span>Principal</span>
                    <strong>
                      {formatMoney(mortgageQuery.data.principalMinor)}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Amortization</span>
                    <strong>
                      {mortgageQuery.data.amortizationMonths} months
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Required Monthly Payment</span>
                    <strong>
                      {formatMoney(mortgageQuery.data.monthlyPaymentMinor)}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="muted">
                  Save a mortgage profile to view payment estimates.
                </p>
              )}
            </article>
          </section>
        </Tabs.Panel>
      </Tabs.Root>

      <Toaster richColors theme="dark" />
    </div>
  )
}

export default App
