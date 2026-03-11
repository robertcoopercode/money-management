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
    })
  })
})

describe("derivePayeeSelection", () => {
  const accounts = [
    { id: "acc-1", name: "Chequing" },
    { id: "acc-2", name: "Savings" },
  ]
  const payees = [
    { id: "payee-1", name: "Grocery Store" },
    { id: "payee-2", name: "Gas Station" },
  ]

  it("returns transfer option when transferAccountId is set", () => {
    const result = derivePayeeSelection("", "acc-2", accounts, payees)
    expect(result).toEqual({
      kind: "transfer",
      id: "transfer:acc-2",
      name: "Savings",
      accountId: "acc-2",
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
})
