import type { PayeeOption } from "../components/payee-autocomplete.js"

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
}

export type EditableField =
  | "date"
  | "account"
  | "amount"
  | "payee"
  | "category"
  | "note"
  | "cleared"

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
})

export const derivePayeeSelection = (
  payeeId: string,
  transferAccountId: string,
  accounts: Array<{ id: string; name: string }>,
  payees: Array<{ id: string; name: string }>,
): PayeeOption | null => {
  if (transferAccountId) {
    const account = accounts.find((a) => a.id === transferAccountId)
    if (account)
      return {
        kind: "transfer",
        id: `transfer:${account.id}`,
        name: account.name,
        accountId: account.id,
      }
  }
  if (payeeId) {
    const payee = payees.find((p) => p.id === payeeId)
    if (payee) return { kind: "payee", id: payee.id, name: payee.name }
  }
  return null
}
