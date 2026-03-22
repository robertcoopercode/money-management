import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { parseMoneyInputToMinor } from "@ledgr/shared"
import { apiFetch } from "../lib/api.js"
import type { Account, LoanProfile, UpdateAccountNameMutationInput } from "../types.js"

type NewAccountState = {
  name: string
  type: Account["type"]
  startingBalance: string
  startingBalanceAt: string
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
          startingBalanceAt: new Date(
            newAccount.startingBalanceAt + "T00:00:00.000Z",
          ).toISOString(),
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

  const toggleAccountActiveMutation = useMutation({
    mutationFn: ({ accountId, isActive }: { accountId: string; isActive: boolean }) =>
      apiFetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Account reactivated" : "Account marked inactive")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update account: ${error.message}`)
    },
  })

  const updateStartingBalanceMutation = useMutation({
    mutationFn: ({
      accountId,
      startingBalanceMinor,
      startingBalanceAt,
    }: {
      accountId: string
      startingBalanceMinor: number
      startingBalanceAt: string
    }) =>
      apiFetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({
          startingBalanceMinor,
          startingBalanceAt: new Date(startingBalanceAt + "T00:00:00.000Z").toISOString(),
        }),
      }),
    onSuccess: () => {
      toast.success("Starting balance updated")
      opts.refetchCoreData()
    },
    onError: (error) => {
      toast.error(`Unable to update starting balance: ${error.message}`)
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
    toggleAccountActiveMutation,
    updateStartingBalanceMutation,
    deleteAccountMutation,
  }
}
