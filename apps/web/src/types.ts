import type { TransactionDraft, EditableField } from "./lib/transaction-entry.js"

export type LoanProfile = {
  loanType: "MORTGAGE" | "AUTO"
  interestRateAnnual: number
  minimumPaymentMinor: number
}

export type Account = {
  id: string
  name: string
  type: "CASH" | "CREDIT" | "INVESTMENT" | "LOAN"
  startingBalanceMinor: number
  balanceMinor: number
  loanProfile: LoanProfile | null
}

export type Payee = {
  id: string
  name: string
  _count?: { transactions: number }
  defaultCategory?: { id: string; name: string; groupId: string } | null
}

export type Tag = {
  id: string
  name: string
  description?: string | null
  backgroundColor: string
  textColor: string
  isArchived: boolean
}

export type Category = {
  id: string
  name: string
  groupId: string
}

export type CategoryGroup = {
  id: string
  name: string
  categories: Category[]
}

export type TransactionSplit = {
  id: string
  categoryId: string
  payeeId?: string | null
  note?: string | null
  amountMinor: number
  category: Category & { group: { id: string; name: string } }
  payee?: Payee | null
  tags?: Array<{ tag: Tag }>
}

export type Transaction = {
  id: string
  date: string
  amountMinor: number
  note?: string | null
  cleared: boolean
  isTransfer: boolean
  transferPairId?: string | null
  transferAccountId?: string | null
  account: Account
  transferAccount?: Account | null
  payee?: Payee | null
  category?: Category | null
  splits: TransactionSplit[]
  tags: Array<{ tag: Tag }>
  origins: Array<{ originType: "MANUAL" | "CSV_IMPORT" }>
}

export type PlanningCategory = {
  categoryId: string
  groupName: string
  categoryName: string
  assignedMinor: number
  activityMinor: number
  availableMinor: number
}

export type PlanningResponse = {
  month: string
  readyToAssignMinor: number
  categories: PlanningCategory[]
}

export type ReportingResponse = {
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

export type AssignmentMutationInput = {
  categoryId: string
  assignedMinor: number
}

export type UpdateTransactionMutationInput = {
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
      tagIds?: string[]
    }>
    tagIds?: string[]
  }
}

export type EditingTransaction = {
  transactionId: string
  draft: TransactionDraft
  focusField: EditableField | null
  focusSplitIndex?: number
}

export type UpdateAccountNameMutationInput = {
  accountId: string
  name: string
}

export const APP_TAB_VALUES = [
  "transactions",
  "accounts",
  "payees",
  "tags",
  "imports",
  "planning",
  "reports",
] as const
export type AppTab = (typeof APP_TAB_VALUES)[number]

export const isAppTab = (value: string): value is AppTab =>
  APP_TAB_VALUES.includes(value as AppTab)

export const getInitialAppTab = (): AppTab => {
  if (typeof window === "undefined") {
    return "transactions"
  }

  const tabParam = new URLSearchParams(window.location.search).get("tab")
  if (tabParam && isAppTab(tabParam)) {
    return tabParam
  }

  return "accounts"
}
