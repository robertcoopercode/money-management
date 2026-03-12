import { useEffect, useMemo, useRef, useState } from "react"
import { Tabs } from "@base-ui/react/tabs"
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ParentSize } from "@visx/responsive"
import {
  AnimatedAxis,
  AnimatedGrid,
  BarSeries,
  Tooltip,
  XYChart,
} from "@visx/xychart"
import { formatMoney, parseMoneyInputToMinor } from "@ledgr/shared"
import { Toaster, toast } from "sonner"
import { LoginPage } from "./pages/login.js"
import { AccountCombobox } from "./components/account-combobox.js"
import { CategoryAutocomplete } from "./components/category-autocomplete.js"
import { PayeeAutocomplete } from "./components/payee-autocomplete.js"
import { PayeeMergeForm } from "./components/payee-merge-form.js"
import { ClearedToggle } from "./components/cleared-toggle.js"
import { DatePicker } from "./components/date-picker.js"
import { buildCsvPreview } from "./lib/csv-preview.js"
import { toDisplayErrorMessage } from "./lib/errors.js"
import {
  buildNextTransactionDraft,
  transactionToEditDraft,
  derivePayeeSelection,
  getSplitBalanceStatus,
  type TransactionDraft,
  type EditableField,
} from "./lib/transaction-entry.js"
import { TransactionEditRow } from "./components/transaction-edit-row.js"
import { SplitEditor } from "./components/split-editor.js"
import type { CsvPreview } from "./lib/csv-preview.js"

import "./App.css"

type LoanProfile = {
  loanType: "MORTGAGE" | "AUTO"
  interestRateAnnual: number
  minimumPaymentMinor: number
}

type Account = {
  id: string
  name: string
  type: "CASH" | "CREDIT" | "INVESTMENT" | "LOAN"
  startingBalanceMinor: number
  balanceMinor: number
  loanProfile: LoanProfile | null
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

type TransactionSplit = {
  id: string
  categoryId: string
  payeeId?: string | null
  note?: string | null
  amountMinor: number
  category: Category & { group: { id: string; name: string } }
  payee?: Payee | null
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
  splits: TransactionSplit[]
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
  accountBalanceTrend: Array<{
    month: string
    balanceMinor: number
  }>
}

type AssignmentMutationInput = {
  categoryId: string
  assignedMinor: number
}

type UpdateTransactionMutationInput = {
  transactionId: string
  patch: {
    accountId?: string
    transferAccountId?: string
    date?: string
    amountMinor?: number
    payeeId?: string
    categoryId?: string
    note?: string
    cleared?: boolean
    splits?: Array<{
      categoryId: string
      payeeId?: string
      note?: string
      amountMinor: number
    }>
  }
}

type EditingTransaction = {
  transactionId: string
  draft: TransactionDraft
  focusField: EditableField | null
}

type UpdateAccountNameMutationInput = {
  accountId: string
  name: string
}

const apiFetch = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
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

const defaultTransactionDate = (() => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
})()
const TRANSACTION_PAGE_SIZE = 100
const APP_TAB_VALUES = [
  "accounts",
  "transactions",
  "payees",
  "imports",
  "planning",
  "reports",
] as const
type AppTab = typeof APP_TAB_VALUES[number]

const isAppTab = (value: string): value is AppTab =>
  APP_TAB_VALUES.includes(value as AppTab)

const getInitialAppTab = (): AppTab => {
  if (typeof window === "undefined") {
    return "accounts"
  }

  const tabParam = new URLSearchParams(window.location.search).get("tab")
  if (tabParam && isAppTab(tabParam)) {
    return tabParam
  }

  return "accounts"
}

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

  const authQuery = useQuery({
    queryKey: ["auth"],
    queryFn: () => apiFetch<{ authenticated: boolean }>("/api/auth/me"),
    retry: false,
  })

  if (authQuery.isLoading) {
    return null
  }

  if (authQuery.isError || !authQuery.data?.authenticated) {
    return (
      <LoginPage
        onSuccess={() =>
          void queryClient.invalidateQueries({ queryKey: ["auth"] })
        }
      />
    )
  }

  return <AuthenticatedApp />
}

const AuthenticatedApp = () => {
  const queryClient = useQueryClient()
  const amountRef = useRef<HTMLInputElement | null>(null)

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
  })

  const [activeTab, setActiveTab] = useState<AppTab>(getInitialAppTab)
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] =
    useState(false)
  const [month, setMonth] = useState(formatMonth(new Date()))
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
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
    payeeId: "",
    cleared: "all" as "all" | "cleared" | "uncleared",
  })
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "CASH" as Account["type"],
    startingBalance: "0",
    loanType: "MORTGAGE" as LoanProfile["loanType"],
    interestRate: "",
    minimumPayment: "",
  })
  const [editingAccountId, setEditingAccountId] = useState("")
  const [accountNameDrafts, setAccountNameDrafts] =
    useState<Record<string, string>>({})
  const [newPayee, setNewPayee] = useState("")
  const [payeeSearch, setPayeeSearch] = useState("")
  const [payeeSort, setPayeeSort] = useState<"name-asc" | "name-desc">(
    "name-asc",
  )
  const [selectedPayeeId, setSelectedPayeeId] = useState("")
  const [payeeMerge, setPayeeMerge] = useState({
    sourcePayeeId: "",
    targetPayeeId: "",
  })
  const [newTransaction, setNewTransaction] = useState<TransactionDraft>({
    accountId: "",
    transferAccountId: "",
    date: defaultTransactionDate,
    amount: "",
    payeeId: "",
    categoryId: "",
    note: "",
    cleared: false,
    isExpense: true,
    splits: [],
  })
  const [transactionOffset, setTransactionOffset] = useState(0)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get("tab") === activeTab) {
      return
    }

    searchParams.set("tab", activeTab)
    const nextQuery = searchParams.toString()
    const nextUrl = `${window.location.pathname}${
      nextQuery ? `?${nextQuery}` : ""
    }${window.location.hash}`
    window.history.replaceState(null, "", nextUrl)
  }, [activeTab])

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
    queryKey: ["transactions", transactionOffset],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(TRANSACTION_PAGE_SIZE),
        offset: String(transactionOffset),
      })
      return apiFetch<Transaction[]>(`/api/transactions?${params}`)
    },
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

      if (reportFilters.payeeId) {
        query.set("payeeIds", reportFilters.payeeId)
      }

      if (reportFilters.cleared !== "all") {
        query.set(
          "cleared",
          reportFilters.cleared === "cleared" ? "true" : "false",
        )
      }

      return apiFetch<ReportingResponse>(`/api/reports?${query.toString()}`)
    },
  })

  const refetchCoreData = () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
    void queryClient.invalidateQueries({ queryKey: ["payees"] })
    void queryClient.invalidateQueries({ queryKey: ["planning"] })
    void queryClient.invalidateQueries({ queryKey: ["reports"] })
  }

  const payeeSelection = useMemo(
    () =>
      derivePayeeSelection(
        newTransaction.payeeId,
        newTransaction.transferAccountId,
        accountsQuery.data ?? [],
        payeesQuery.data ?? [],
        newTransaction.accountId,
      ),
    [
      newTransaction.payeeId,
      newTransaction.transferAccountId,
      accountsQuery.data,
      payeesQuery.data,
      newTransaction.accountId,
    ],
  )

  const isNewTransactionLoanTransfer = useMemo(() => {
    if (!newTransaction.transferAccountId) return false
    const accounts = accountsQuery.data ?? []
    const sourceAccount = accounts.find(
      (a) => a.id === newTransaction.accountId,
    )
    const targetAccount = accounts.find(
      (a) => a.id === newTransaction.transferAccountId,
    )
    return sourceAccount?.type === "LOAN" || targetAccount?.type === "LOAN"
  }, [
    newTransaction.accountId,
    newTransaction.transferAccountId,
    accountsQuery.data,
  ])

  const [editingTransaction, setEditingTransaction] =
    useState<EditingTransaction | null>(null)

  const startEditing = (transaction: Transaction, field: EditableField) => {
    setEditingTransaction({
      transactionId: transaction.id,
      draft: transactionToEditDraft(transaction),
      focusField: field,
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

  const clearAccountNameDraft = (accountId: string) => {
    setAccountNameDrafts((current) => {
      const next = { ...current }
      delete next[accountId]
      return next
    })
  }

  const createAccountMutation = useMutation({
    mutationFn: () =>
      apiFetch<Account>("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: newAccount.name,
          type: newAccount.type,
          startingBalanceMinor: parseMoneyInputToMinor(
            newAccount.startingBalance,
          ),
          ...(newAccount.type === "LOAN"
            ? {
                loanType: newAccount.loanType,
                interestRateAnnual: Number(newAccount.interestRate) || 0,
                minimumPaymentMinor: parseMoneyInputToMinor(
                  newAccount.minimumPayment,
                ),
              }
            : {}),
        }),
      }),
    onSuccess: (account) => {
      toast.success("Account created")
      setIsCreateAccountDialogOpen(false)
      setNewAccount({
        name: "",
        type: "CASH",
        startingBalance: "0",
        loanType: "MORTGAGE",
        interestRate: "",
        minimumPayment: "",
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

  const updateAccountNameMutation = useMutation({
    mutationFn: ({ accountId, name }: UpdateAccountNameMutationInput) =>
      apiFetch<Account>(`/api/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (_, input) => {
      toast.success("Account name updated")
      setEditingAccountId("")
      clearAccountNameDraft(input.accountId)
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to rename account: ${error.message}`)
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiFetch(`/api/accounts/${accountId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Account deleted")
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete account: ${error.message}`)
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

  const createCategoryMutation = useMutation({
    mutationFn: (input: { name: string }) =>
      apiFetch<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Category created")
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      void queryClient.invalidateQueries({ queryKey: ["planning"] })
    },
    onError: (error) => {
      toast.error(`Unable to create category: ${error.message}`)
    },
  })

  const createTransactionPayeeMutation = useMutation({
    mutationFn: (input: { name: string }) =>
      apiFetch<Payee>("/api/payees", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Payee created")
      void queryClient.invalidateQueries({ queryKey: ["payees"] })
      void queryClient.invalidateQueries({ queryKey: ["reports"] })
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
    mutationFn: () => {
      const parentAmountMinor = newTransaction.isExpense
        ? -Math.abs(parseMoneyInputToMinor(newTransaction.amount))
        : Math.abs(parseMoneyInputToMinor(newTransaction.amount))
      const hasSplits = newTransaction.splits.length > 0

      return apiFetch<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
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
        }),
      })
    },
    onSuccess: () => {
      toast.success("Transaction saved")
      setNewTransaction((current) => buildNextTransactionDraft(current))
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
      setEditingTransaction(null)
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
        rowsSkipped: number
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
        `Imported ${result.rowsTotal} rows (${result.rowsMatched} matched, ${result.rowsCreated} created, ${result.rowsSkipped} skipped).`,
      )
      setSelectedCsvFile(null)
      setCsvPreview(null)
      refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
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

  const accountBalanceTrendChartData =
    reportingQuery.data?.accountBalanceTrend.map((item) => ({
      month: item.month,
      balance: Number((item.balanceMinor / 100).toFixed(2)),
    })) ?? []
  const transactionsHasNextPage =
    (transactionsQuery.data?.length ?? 0) >= TRANSACTION_PAGE_SIZE

  const visiblePayees = useMemo(() => {
    const normalizedSearch = payeeSearch.trim().toLowerCase()
    const filtered = (payeesQuery.data ?? []).filter((payee) =>
      payee.name.toLowerCase().includes(normalizedSearch),
    )

    filtered.sort((left, right) => {
      if (payeeSort === "name-asc") {
        return left.name.localeCompare(right.name)
      }

      return right.name.localeCompare(left.name)
    })

    return filtered
  }, [payeesQuery.data, payeeSearch, payeeSort])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <img
            className="brand-mark"
            src="/ledgr-favicon.svg"
            alt="Ledgr logo"
          />
          <div>
            <h1>Ledgr</h1>
          </div>
        </div>
        <div className="header-right">
          <div className="ready-to-assign-pill">
            <span className="ready-to-assign-label">Ready to Assign</span>
            <span className="ready-to-assign-amount">
              {formatMoney(planningQuery.data?.readyToAssignMinor ?? 0)}
            </span>
          </div>
          <BaseTooltip.Provider>
            <BaseTooltip.Root>
              <BaseTooltip.Trigger
                className="logout-icon-button"
                onClick={() => logoutMutation.mutate()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </BaseTooltip.Trigger>
              <BaseTooltip.Portal>
                <BaseTooltip.Positioner sideOffset={8}>
                  <BaseTooltip.Popup className="logout-tooltip">
                    Log out
                  </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
              </BaseTooltip.Portal>
            </BaseTooltip.Root>
          </BaseTooltip.Provider>
        </div>
      </header>

      <Tabs.Root
        className="tabs-root"
        value={activeTab}
        onValueChange={(value) => {
          if (isAppTab(value)) {
            setActiveTab(value)
          }
        }}
      >
        <Tabs.List className="tabs-list">
          <Tabs.Tab className="tabs-tab" value="accounts">
            Accounts
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="transactions">
            Transactions
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
          <Tabs.Indicator className="tabs-indicator" />
        </Tabs.List>

        <Tabs.Panel className="panel" value="accounts">
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
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="transactions">
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
                createTransactionMutation.mutate()
              }}
            >
              <AccountCombobox
                accounts={accountsQuery.data ?? []}
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
                payees={payeesQuery.data ?? []}
                accounts={accountsQuery.data ?? []}
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
                onManagePayees={() => setActiveTab("payees")}
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
                  categoryGroups={categoriesQuery.data ?? []}
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
                  payees={payeesQuery.data ?? []}
                  accounts={accountsQuery.data ?? []}
                  categoryGroups={categoriesQuery.data ?? []}
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
                        accounts={accountsQuery.data ?? []}
                        payees={payeesQuery.data ?? []}
                        categoryGroups={categoriesQuery.data ?? []}
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
                        onManagePayees={() => setActiveTab("payees")}
                        onCreateCategory={(name) =>
                          createCategoryMutation.mutateAsync({ name })
                        }
                        isCreatingCategory={createCategoryMutation.isPending}
                      />
                    ) : (
                      <div
                        key={transaction.id}
                        className="transaction-row"
                        role="row"
                      >
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
                                  transaction.transferAccount?.type ===
                                    "LOAN" ||
                                  transaction.account.type === "LOAN"
                                if (isLoan) {
                                  return transaction.transferAccount?.type ===
                                    "LOAN"
                                    ? `Payment to ${targetName}`
                                    : `Payment from ${targetName}`
                                }
                                return targetName
                              })()
                            : (transaction.payee?.name ?? "—")}
                        </div>
                        <div
                          className="transaction-cell clickable-cell"
                          role="cell"
                          tabIndex={0}
                          onClick={() => startEditing(transaction, "category")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              startEditing(transaction, "category")
                          }}
                        >
                          {transaction.splits?.length > 0
                            ? "Split transaction"
                            : transaction.isTransfer
                              ? transaction.category?.name
                                ? transaction.category.name
                                : (() => {
                                    const isLoan =
                                      transaction.transferAccount?.type ===
                                        "LOAN" ||
                                      transaction.account.type === "LOAN"
                                    if (isLoan) {
                                      return transaction.transferAccount
                                        ?.type === "LOAN"
                                        ? `Payment to ${transaction.transferAccount?.name ?? "Account"}`
                                        : `Payment from ${transaction.transferAccount?.name ?? "Account"}`
                                    }
                                    return `Transfer → ${transaction.transferAccount?.name ?? "Account"}`
                                  })()
                              : (transaction.category?.name ?? "—")}
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
                                deleteTransactionMutation.mutate(transaction.id)
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
              <PayeeMergeForm
                payees={payeesQuery.data ?? []}
                selection={payeeMerge}
                isPending={mergePayeeMutation.isPending}
                onSelectionChange={setPayeeMerge}
                onInvalidSubmit={() => {
                  toast.error("Pick two different payees to perform a merge.")
                }}
                onValidSubmit={() => {
                  mergePayeeMutation.mutate()
                }}
              />
            </article>
          </section>

          <section className="card">
            <h2>Payees</h2>
            <div className="inline-controls" style={{ marginBottom: "0.8rem" }}>
              <label>
                Search
                <input
                  value={payeeSearch}
                  onChange={(event) => setPayeeSearch(event.target.value)}
                  placeholder="Search payees..."
                />
              </label>
              <label>
                Sort
                <select
                  value={payeeSort}
                  onChange={(event) =>
                    setPayeeSort(event.target.value as "name-asc" | "name-desc")
                  }
                >
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                </select>
              </label>
              <label>
                Inspect transactions
                <select
                  value={selectedPayeeId}
                  onChange={(event) => setSelectedPayeeId(event.target.value)}
                >
                  <option value="">Select payee</option>
                  {visiblePayees.map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="list">
              {payeesQuery.isError ? (
                <p className="error-text">
                  {toDisplayErrorMessage(
                    payeesQuery.error,
                    "Failed to load payees.",
                  )}
                </p>
              ) : null}
              {payeesQuery.isLoading ? (
                <p className="muted">Loading payees...</p>
              ) : (payeesQuery.data?.length ?? 0) === 0 ? (
                <p className="muted">No payees yet.</p>
              ) : visiblePayees.length === 0 ? (
                <p className="muted">No payees match your search.</p>
              ) : (
                visiblePayees.map((payee) => (
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
                    {payeeTransactionsQuery.isError ? (
                      <tr>
                        <td colSpan={5} className="error-text">
                          {toDisplayErrorMessage(
                            payeeTransactionsQuery.error,
                            "Failed to load payee transactions.",
                          )}
                        </td>
                      </tr>
                    ) : null}
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
                            {transaction.splits?.length > 0
                              ? "Split transaction"
                              : transaction.isTransfer
                                ? transaction.category?.name
                                  ? transaction.category.name
                                  : (() => {
                                      const isLoan =
                                        transaction.transferAccount?.type ===
                                          "LOAN" ||
                                        transaction.account.type === "LOAN"
                                      if (isLoan) {
                                        return transaction.transferAccount
                                          ?.type === "LOAN"
                                          ? `Payment to ${transaction.transferAccount?.name ?? "Account"}`
                                          : `Payment from ${transaction.transferAccount?.name ?? "Account"}`
                                      }
                                      return `Transfer → ${transaction.transferAccount?.name ?? "Account"}`
                                    })()
                                : (transaction.category?.name ?? "—")}
                          </td>
                          <td>{transaction.note || ""}</td>
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
              <AccountCombobox
                accounts={accountsQuery.data ?? []}
                value={newTransaction.accountId}
                onChange={(accountId) =>
                  setNewTransaction((current) => ({
                    ...current,
                    accountId,
                  }))
                }
                placeholder="Select account"
              />
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setSelectedCsvFile(file)

                  if (!file) {
                    setCsvPreview(null)
                    return
                  }

                  void parseCsvFile(file).then((csvText) => {
                    setCsvPreview(buildCsvPreview(csvText))
                  })
                }}
              />
              <button
                type="button"
                disabled={!selectedCsvFile || uploadCsvMutation.isPending}
                onClick={() => uploadCsvMutation.mutate()}
              >
                Import CSV
              </button>
            </div>

            {csvPreview ? (
              <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
                <table>
                  <thead>
                    <tr>
                      {csvPreview.headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row, index) => (
                      <tr key={`${index}-${row.join("-")}`}>
                        {csvPreview.headers.map((_, headerIndex) => (
                          <td key={`${index}-${headerIndex}`}>
                            {row[headerIndex] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: "0.8rem" }}>
                Select a CSV file to preview first five rows before import.
              </p>
            )}
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
            {planningQuery.isError ? (
              <p className="error-text">
                {toDisplayErrorMessage(
                  planningQuery.error,
                  "Failed to load planning data.",
                )}
              </p>
            ) : null}

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
            {reportingQuery.isError ? (
              <p className="error-text">
                {toDisplayErrorMessage(
                  reportingQuery.error,
                  "Failed to load reporting data.",
                )}
              </p>
            ) : null}
            <div className="inline-controls">
              <label>
                From
                <DatePicker
                  value={reportRange.fromDate}
                  onChange={(fromDate) =>
                    setReportRange((current) => ({
                      ...current,
                      fromDate,
                    }))
                  }
                />
              </label>
              <label>
                To
                <DatePicker
                  value={reportRange.toDate}
                  onChange={(toDate) =>
                    setReportRange((current) => ({
                      ...current,
                      toDate,
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
              <label>
                Payee
                <select
                  value={reportFilters.payeeId}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      payeeId: event.target.value,
                    }))
                  }
                >
                  <option value="">All payees</option>
                  {(payeesQuery.data ?? []).map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cleared Status
                <select
                  value={reportFilters.cleared}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      cleared: event.target
                        .value as "all" | "cleared" | "uncleared",
                    }))
                  }
                >
                  <option value="all">All</option>
                  <option value="cleared">Cleared only</option>
                  <option value="uncleared">Uncleared only</option>
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

            <div className="chart-card">
              {reportingQuery.isLoading ? (
                <p className="muted">Loading account balance trend...</p>
              ) : accountBalanceTrendChartData.length === 0 ? (
                <p className="muted">
                  No account balance trend for selected filters.
                </p>
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
                        dataKey="Account Balance"
                        data={accountBalanceTrendChartData}
                        xAccessor={(d) => d.month}
                        yAccessor={(d) => d.balance}
                      />
                      <Tooltip
                        renderTooltip={({ tooltipData }) => {
                          const datum = tooltipData?.nearestDatum?.datum as {
                            month: string
                            balance: number
                          } | undefined

                          if (!datum) {
                            return null
                          }

                          return (
                            <div className="tooltip">
                              <strong>{datum.month}</strong>
                              <div>
                                {formatMoney(Math.round(datum.balance * 100))}
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
      </Tabs.Root>

      <Toaster richColors theme="dark" />
    </div>
  )
}

export default App
