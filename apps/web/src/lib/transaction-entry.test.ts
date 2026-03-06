import { describe, expect, it } from "vitest"

import { buildNextTransactionDraft } from "./transaction-entry.js"

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
    })

    expect(nextDraft).toEqual({
      accountId: "account-1",
      transferAccountId: "",
      date: "2026-03-06",
      amount: "",
      payeeId: "",
      categoryId: "",
      note: "",
      cleared: false,
    })
  })
})
