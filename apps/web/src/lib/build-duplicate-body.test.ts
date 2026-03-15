import { describe, expect, it, vi } from "vitest"
import { buildDuplicateBody } from "./build-duplicate-body.js"
import type { Transaction } from "../types.js"

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "txn-1",
  date: "2026-01-15",
  amountMinor: -2500,
  note: null,
  clearingStatus: "CLEARED",
  manualCreated: true,
  pendingApproval: false,
  importedTransactionId: null,
  importedTransaction: null,
  isTransfer: false,
  transferPairId: null,
  transferAccountId: null,
  account: {
    id: "acc-1",
    name: "Chequing",
    type: "CASH",
    startingBalanceMinor: 0,
    balanceMinor: 10000,
    loanProfile: null,
  },
  transferAccount: null,
  payee: null,
  category: null,
  splits: [],
  tags: [],
  origins: [{ originType: "MANUAL" }],
  ...overrides,
})

describe("buildDuplicateBody", () => {
  it("returns correct accountId, amountMinor, clearingStatus: UNCLEARED, and same date", () => {
    const body = buildDuplicateBody(makeTransaction({ date: "2026-01-15" }))

    expect(body.accountId).toBe("acc-1")
    expect(body.amountMinor).toBe(-2500)
    expect(body.clearingStatus).toBe("UNCLEARED")
    expect(body.date).toBe("2026-01-15")
  })

  it("preserves payeeId, categoryId, and note when present", () => {
    const body = buildDuplicateBody(
      makeTransaction({
        payee: { id: "payee-1", name: "Grocery Store" },
        category: { id: "cat-1", name: "Food", groupId: "grp-1" },
        note: "Weekly groceries",
      }),
    )

    expect(body.payeeId).toBe("payee-1")
    expect(body.categoryId).toBe("cat-1")
    expect(body.note).toBe("Weekly groceries")
  })

  it("omits payeeId, categoryId, and note when null/undefined", () => {
    const body = buildDuplicateBody(makeTransaction())

    expect(body).not.toHaveProperty("payeeId")
    expect(body).not.toHaveProperty("categoryId")
    expect(body).not.toHaveProperty("note")
  })

  it("includes splits array and omits top-level categoryId for split transactions", () => {
    const body = buildDuplicateBody(
      makeTransaction({
        splits: [
          {
            id: "split-1",
            categoryId: "cat-1",
            payeeId: "payee-1",
            note: "Part A",
            amountMinor: -1500,
            category: { id: "cat-1", name: "Food", groupId: "grp-1", group: { id: "grp-1", name: "Essentials" } },
            payee: { id: "payee-1", name: "Store A" },
          },
          {
            id: "split-2",
            categoryId: "cat-2",
            payeeId: null,
            note: null,
            amountMinor: -1000,
            category: { id: "cat-2", name: "Transport", groupId: "grp-2", group: { id: "grp-2", name: "Bills" } },
            payee: null,
          },
        ],
      }),
    )

    expect(body).not.toHaveProperty("categoryId")
    expect(body.splits).toEqual([
      { categoryId: "cat-1", payeeId: "payee-1", note: "Part A", amountMinor: -1500 },
      { categoryId: "cat-2", amountMinor: -1000 },
    ])
  })

  it("includes transferAccountId for transfer transactions", () => {
    const body = buildDuplicateBody(
      makeTransaction({
        isTransfer: true,
        transferAccountId: "acc-2",
        transferPairId: "pair-1",
        transferAccount: {
          id: "acc-2",
          name: "Savings",
          type: "CASH",
          startingBalanceMinor: 0,
          balanceMinor: 5000,
          loanProfile: null,
        },
      }),
    )

    expect(body.transferAccountId).toBe("acc-2")
  })

  it("preserves categoryId for loan transfers", () => {
    const body = buildDuplicateBody(
      makeTransaction({
        isTransfer: true,
        transferAccountId: "acc-loan",
        transferPairId: "pair-1",
        category: { id: "cat-interest", name: "Interest", groupId: "grp-1" },
      }),
    )

    expect(body.categoryId).toBe("cat-interest")
    expect(body.transferAccountId).toBe("acc-loan")
  })
})
