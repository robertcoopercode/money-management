import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { parseMoneyInputToMinor } from "@ledgr/shared"
import { apiFetch } from "../lib/api.js"
import type { Account, LoanProfile, UpdateAccountNameMutationInput } from "../types.js"

type NewAccountState = {
  name: string
  type: Account["type"]
  startingBalance: string
  loanType: LoanProfile["loanType"]
  interestRate: string
  minimumPayment: string
}

export const useAccountMutations = (opts: {
  refetchCoreData: () => void
  onAccountCreated?: (account: Account) => void
  onAccountNameUpdated?: (accountId: string) => void
  onCreateReset?: () => void
}) => {
  const createAccountMutation = useMutation({
    mutationFn: (newAccount: NewAccountState) =>
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
      opts.onCreateReset?.()
      opts.onAccountCreated?.(account)
      opts.refetchCoreData()
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
      opts.onAccountNameUpdated?.(input.accountId)
      opts.refetchCoreData()
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
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to delete account: ${error.message}`)
    },
  })

  return {
    createAccountMutation,
    updateAccountNameMutation,
    deleteAccountMutation,
  }
}
