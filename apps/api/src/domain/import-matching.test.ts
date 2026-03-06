import { describe, expect, it } from "vitest"

import { findBestImportCandidate } from "./import-matching.js"

const d = (value: string) => new Date(`${value}T00:00:00.000Z`)

describe("findBestImportCandidate", () => {
  it("selects the closest date candidate in a ±3 day window", () => {
    const result = findBestImportCandidate({
      amountMinor: -5_000,
      transactionDate: d("2026-03-10"),
      alreadyMatchedTransactionIds: new Set(),
      candidates: [
        {
          id: "tx-a",
          amountMinor: -5_000,
          date: d("2026-03-13"),
          cleared: false,
        },
        {
          id: "tx-b",
          amountMinor: -5_000,
          date: d("2026-03-11"),
          cleared: false,
        },
      ],
    })

    expect(result?.candidateId).toBe("tx-b")
    expect(result?.score).toBeGreaterThan(0.6)
  })

  it("prefers uncleared transactions when dates tie", () => {
    const result = findBestImportCandidate({
      amountMinor: -2_500,
      transactionDate: d("2026-04-02"),
      alreadyMatchedTransactionIds: new Set(),
      candidates: [
        {
          id: "tx-cleared",
          amountMinor: -2_500,
          date: d("2026-04-01"),
          cleared: true,
        },
        {
          id: "tx-uncleared",
          amountMinor: -2_500,
          date: d("2026-04-01"),
          cleared: false,
        },
      ],
    })

    expect(result?.candidateId).toBe("tx-uncleared")
  })

  it("rejects candidates outside matching rules", () => {
    const result = findBestImportCandidate({
      amountMinor: -4_200,
      transactionDate: d("2026-04-02"),
      alreadyMatchedTransactionIds: new Set(["tx-used"]),
      candidates: [
        {
          id: "tx-used",
          amountMinor: -4_200,
          date: d("2026-04-02"),
          cleared: false,
        },
        {
          id: "tx-far",
          amountMinor: -4_200,
          date: d("2026-04-09"),
          cleared: false,
        },
        {
          id: "tx-mismatch",
          amountMinor: -4_100,
          date: d("2026-04-02"),
          cleared: false,
        },
      ],
    })

    expect(result).toBeNull()
  })
})
