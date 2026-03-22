import type { TransactionDraft, EditableField } from "./lib/transaction-entry.js"

export type LoanProfile = {
  loanType: "MORTGAGE" | "AUTO"
  interestRateAnnual: number
  minimumPaymentMinor: number
}

export type ClearingStatus = "UNCLEARED" | "CLEARED" | "RECONCILED"

export type Account = {
  id: string
  name: string
  type: "CASH" | "CREDIT" | "INVESTMENT" | "LOAN"
  isActive: boolean
  startingBalanceMinor: number
  startingBalanceAt: string
  clearedBalanceMinor: number
  unclearedBalanceMinor: number
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
  groupId: string | null
  sortOrder?: string
  isIncomeCategory?: boolean
}

export type CategoryGroup = {
  id: string
  name: string
  sortOrder?: string
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
  clearingStatus: ClearingStatus
  manualCreated: boolean
  pendingApproval: boolean
  importedTransactionId?: string | null
  importedTransaction?: {
    id: string
    date: string
    amountMinor: number
    payeeName: string
    note?: string | null
  } | null
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

export type PlanningCategoryItem = {
  categoryId: string
  categoryName: string
  sortOrder: string
  assignedMinor: number
  activityMinor: number
  availableMinor: number
  isIncomeCategory?: boolean
}

export type PlanningGroup = {
  groupId: string
  groupName: string
  groupSortOrder: string
  categories: PlanningCategoryItem[]
}

export type PlanningResponse = {
  month: string
  readyToAssignMinor: number
  groups: PlanningGroup[]
}

export type { CategoryReportResponse } from "@ledgr/shared"

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
    clearingStatus?: ClearingStatus
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
  "budget",
  "reports",
  "configure",
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

  return "transactions"
}
