import { parseMoneyInputToMinor, formatMoney } from "@ledgr/shared"
import type { PayeeOption } from "../components/payee-autocomplete.js"

export type SplitDraft = {
  id?: string
  categoryId: string
  payeeId: string
  note: string
  amount: string
  isExpense: boolean
}

export type TransactionDraft = {
  accountId: string
  transferAccountId: string
  date: string
  amount: string
  isExpense: boolean
  payeeId: string
  categoryId: string
  note: string
  cleared: boolean
  splits: SplitDraft[]
}

export type EditableField = "date" | "account" | "amount" | "payee" | "category" | "note" | "cleared"

export const buildNextTransactionDraft = (
  current: TransactionDraft,
): TransactionDraft => ({
  ...current,
  amount: "",
  payeeId: "",
  transferAccountId: "",
  categoryId: "",
  note: "",
  cleared: false,
  splits: [],
})

export const transactionToEditDraft = (transaction: {
  amountMinor: number
  date: string
  cleared: boolean
  note?: string | null
  transferAccountId?: string | null
  account: { id: string }
  payee?: { id: string } | null
  category?: { id: string } | null
  splits?: Array<{
    id: string
    categoryId: string
    payeeId?: string | null
    note?: string | null
    amountMinor: number
  }>
}): TransactionDraft => ({
  accountId: transaction.account.id,
  transferAccountId: transaction.transferAccountId ?? "",
  date: new Date(transaction.date).toISOString().slice(0, 10),
  amount: String(Math.abs(transaction.amountMinor) / 100),
  isExpense: transaction.amountMinor < 0,
  payeeId: transaction.payee?.id ?? "",
  categoryId: transaction.category?.id ?? "",
  note: transaction.note ?? "",
  cleared: transaction.cleared,
  splits: (transaction.splits ?? []).map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    payeeId: s.payeeId ?? "",
    note: s.note ?? "",
    amount: String(Math.abs(s.amountMinor) / 100),
    isExpense: s.amountMinor < 0,
  })),
})

export const derivePayeeSelection = (
  payeeId: string,
  transferAccountId: string,
  accounts: Array<{ id: string; name: string; type: string }>,
  payees: Array<{ id: string; name: string }>,
  currentAccountId?: string,
): PayeeOption | null => {
  if (transferAccountId) {
    const account = accounts.find((a) => a.id === transferAccountId)
    if (account) {
      const currentAccount = currentAccountId
        ? accounts.find((a) => a.id === currentAccountId)
        : undefined
      const isLoanTransfer =
        account.type === "LOAN" || currentAccount?.type === "LOAN"
      let displayName = account.name
      if (isLoanTransfer) {
        displayName =
          account.type === "LOAN"
            ? `Payment to ${account.name}`
            : `Payment from ${account.name}`
      }
      return {
        kind: "transfer",
        id: `transfer:${account.id}`,
        name: displayName,
        accountId: account.id,
        isLoanPayment: isLoanTransfer,
      }
    }
  }
  if (payeeId) {
    const payee = payees.find((p) => p.id === payeeId)
    if (payee) return { kind: "payee", id: payee.id, name: payee.name }
  }
  return null
}

export type SplitBalanceStatus = {
  isBalanced: boolean
  isOverAssigned: boolean
  remainingMinor: number
  message: string
}

export const getSplitBalanceStatus = (
  splits: SplitDraft[],
  parentAmountMinor: number,
): SplitBalanceStatus => {
  const splitSumMinor = splits.reduce((sum, s) => {
    const raw = parseMoneyInputToMinor(s.amount)
    return sum + (s.isExpense ? -Math.abs(raw) : Math.abs(raw))
  }, 0)
  const remainingMinor = parentAmountMinor - splitSumMinor
  const isBalanced = remainingMinor === 0
  const isOverAssigned = Math.abs(splitSumMinor) > Math.abs(parentAmountMinor)
  const amount = formatMoney(Math.abs(remainingMinor))

  let message = ""
  if (!isBalanced) {
    message = isOverAssigned
      ? `Amount over-assigned by ${amount}.`
      : `${amount} remaining to assign.`
  }

  return { isBalanced, isOverAssigned, remainingMinor, message }
}
