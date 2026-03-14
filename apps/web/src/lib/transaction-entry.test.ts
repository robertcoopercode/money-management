import { describe, expect, it } from "vitest"

import {
  buildNextTransactionDraft,
  transactionToEditDraft,
  derivePayeeSelection,
} from "./transaction-entry.js"

describe("buildNextTransactionDraft", () => {
  it("keeps account/date context for rapid keyboard entry", () => {
    const nextDraft = buildNextTransactionDraft({
      accountId: "account-1",
      transferAccountId: "",
      date: "2026-03-06",
      amount: "12.34",
      payeeId: "payee-1",
      categoryId: "category-1",
      note: "Lunch",
      cleared: true,
      isExpense: true,
      splits: [],
    })

    expect(nextDraft).toEqual({
      accountId: "account-1",
      transferAccountId: "",
      date: "2026-03-06",
      amount: "",
      isExpense: true,
      payeeId: "",
      categoryId: "",
      note: "",
      cleared: false,
      splits: [],
      tagIds: [],
    })
  })
})

describe("transactionToEditDraft", () => {
  it("converts a negative amount to isExpense with absolute value", () => {
    const draft = transactionToEditDraft({
      amountMinor: -1550,
      date: "2026-03-10T00:00:00.000Z",
      cleared: true,
      note: "Coffee",
      transferAccountId: null,
      account: { id: "acc-1" },
      payee: { id: "payee-1" },
      category: { id: "cat-1" },
    })

    expect(draft).toEqual({
      accountId: "acc-1",
      transferAccountId: "",
      date: "2026-03-10",
      amount: "15.5",
      isExpense: true,
      payeeId: "payee-1",
      categoryId: "cat-1",
      note: "Coffee",
      cleared: true,
      splits: [],
      tagIds: [],
    })
  })

  it("converts a positive amount to non-expense", () => {
    const draft = transactionToEditDraft({
      amountMinor: 5000,
      date: "2026-01-15T00:00:00.000Z",
      cleared: false,
      note: null,
      transferAccountId: "acc-2",
      account: { id: "acc-1" },
      payee: null,
      category: null,
    })

    expect(draft).toEqual({
      accountId: "acc-1",
      transferAccountId: "acc-2",
      date: "2026-01-15",
      amount: "50",
      isExpense: false,
      payeeId: "",
      categoryId: "",
      note: "",
      cleared: false,
      splits: [],
      tagIds: [],
    })
  })
})

describe("derivePayeeSelection", () => {
  const accounts = [
    { id: "acc-1", name: "Chequing", type: "CASH" },
    { id: "acc-2", name: "Savings", type: "CASH" },
    { id: "acc-3", name: "Mortgage", type: "LOAN" },
  ]
  const payees = [
    { id: "payee-1", name: "Grocery Store" },
    { id: "payee-2", name: "Gas Station" },
  ]

  it("returns 'Transfer to' for outgoing non-loan transfer", () => {
    const result = derivePayeeSelection("", "acc-2", accounts, payees, "acc-1", true)
    expect(result).toEqual({
      kind: "transfer",
      id: "transfer:acc-2",
      name: "Transfer to Savings",
      accountId: "acc-2",
      isLoanPayment: false,
    })
  })

  it("returns 'Transfer from' for incoming non-loan transfer", () => {
    const result = derivePayeeSelection("", "acc-2", accounts, payees, "acc-1", false)
    expect(result).toEqual({
      kind: "transfer",
      id: "transfer:acc-2",
      name: "Transfer from Savings",
      accountId: "acc-2",
      isLoanPayment: false,
    })
  })

  it("returns payee option when payeeId is set", () => {
    const result = derivePayeeSelection("payee-1", "", accounts, payees)
    expect(result).toEqual({
      kind: "payee",
      id: "payee-1",
      name: "Grocery Store",
    })
  })

  it("returns null when neither is set", () => {
    const result = derivePayeeSelection("", "", accounts, payees)
    expect(result).toBeNull()
  })

  it("prefers transfer over payee when both are set", () => {
    const result = derivePayeeSelection("payee-1", "acc-2", accounts, payees)
    expect(result?.kind).toBe("transfer")
  })

  it("shows 'Payment to' when transferring to a loan account", () => {
    const result = derivePayeeSelection("", "acc-3", accounts, payees, "acc-1")
    expect(result).toEqual({
      kind: "transfer",
      id: "transfer:acc-3",
      name: "Payment to Mortgage",
      accountId: "acc-3",
      isLoanPayment: true,
    })
  })

  it("shows 'Payment from' when viewing from loan account", () => {
    const result = derivePayeeSelection("", "acc-1", accounts, payees, "acc-3")
    expect(result).toEqual({
      kind: "transfer",
      id: "transfer:acc-1",
      name: "Payment from Chequing",
      accountId: "acc-1",
      isLoanPayment: true,
    })
  })
})
