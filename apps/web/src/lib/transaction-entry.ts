export type TransactionDraft = {
  accountId: string
  transferAccountId: string
  date: string
  amount: string
  payeeId: string
  categoryId: string
  note: string
  cleared: boolean
}

export const buildNextTransactionDraft = (
  current: TransactionDraft,
): TransactionDraft => ({
  ...current,
  amount: "",
  payeeId: "",
  categoryId: "",
  note: "",
  cleared: false,
})
