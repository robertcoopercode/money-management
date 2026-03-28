import type { AccountType, LoanType } from "../../src/generated/prisma/client.js"

export type AccountSeed = {
  name: string
  type: AccountType
  startingBalanceMinor: number
}

export type LoanProfileSeed = {
  accountName: string
  loanType: LoanType
  interestRateAnnual: number
  minimumPaymentMinor: number
  defaultCategoryName?: string
}

export const accounts: AccountSeed[] = [
  { name: "TD Chequing", type: "CASH", startingBalanceMinor: 520000 },
  { name: "Scotiabank Savings", type: "CASH", startingBalanceMinor: 1240000 },
  { name: "CIBC Visa", type: "CREDIT", startingBalanceMinor: -134000 },
  { name: "TD Visa Infinite", type: "CREDIT", startingBalanceMinor: -62000 },
  { name: "Cash Wallet", type: "CASH", startingBalanceMinor: 18000 },
  { name: "Wealthsimple TFSA", type: "INVESTMENT", startingBalanceMinor: 3450000 },
  { name: "Wealthsimple RRSP", type: "INVESTMENT", startingBalanceMinor: 1820000 },
  { name: "Honda CR-V Loan (TD)", type: "LOAN", startingBalanceMinor: -1845000 },
  { name: "Scotiabank Mortgage", type: "LOAN", startingBalanceMinor: -31200000 },
]

export const loanProfiles: LoanProfileSeed[] = [
  {
    accountName: "Honda CR-V Loan (TD)",
    loanType: "AUTO",
    interestRateAnnual: 5.49,
    minimumPaymentMinor: 42500,
    defaultCategoryName: "🚗 Car Payment",
  },
  {
    accountName: "Scotiabank Mortgage",
    loanType: "MORTGAGE",
    interestRateAnnual: 4.19,
    minimumPaymentMinor: 158000,
    defaultCategoryName: "🏠 Mortgage",
  },
]
