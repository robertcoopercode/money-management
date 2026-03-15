import { describe, expect, it } from "vitest"

import { findBestImportCandidate, MAX_MATCH_DAY_WINDOW } from "./import-matching.js"

const d = (value: string) => new Date(`${value}T00:00:00.000Z`)

describe("findBestImportCandidate", () => {
  it("uses a ±10 day matching window", () => {
    expect(MAX_MATCH_DAY_WINDOW).toBe(10)
  })

  it("selects the closest date candidate in a ±10 day window", () => {
    const result = findBestImportCandidate({
      amountMinor: -5_000,
      transactionDate: d("2026-03-10"),
      alreadyMatchedTransactionIds: new Set(),
      candidates: [
        {
          id: "tx-a",
          amountMinor: -5_000,
          date: d("2026-03-20"),
          clearingStatus: "UNCLEARED",
        },
        {
          id: "tx-b",
          amountMinor: -5_000,
          date: d("2026-03-11"),
          clearingStatus: "UNCLEARED",
        },
      ],
    })

    expect(result?.candidateId).toBe("tx-b")
    expect(result?.score).toBeGreaterThan(0.8)
  })

  it("matches a candidate exactly 10 days away", () => {
    const result = findBestImportCandidate({
      amountMinor: -2_000,
      transactionDate: d("2026-03-01"),
      alreadyMatchedTransactionIds: new Set(),
      candidates: [
        {
          id: "tx-edge",
          amountMinor: -2_000,
          date: d("2026-03-11"),
          clearingStatus: "UNCLEARED",
        },
      ],
    })

    expect(result?.candidateId).toBe("tx-edge")
    expect(result?.score).toBe(0)
  })

  it("rejects a candidate at 11 days", () => {
    const result = findBestImportCandidate({
      amountMinor: -2_000,
      transactionDate: d("2026-03-01"),
      alreadyMatchedTransactionIds: new Set(),
      candidates: [
        {
          id: "tx-far",
          amountMinor: -2_000,
          date: d("2026-03-12"),
          clearingStatus: "UNCLEARED",
        },
      ],
    })

    expect(result).toBeNull()
  })

  it("returns score 1.0 at 0 day difference", () => {
    const result = findBestImportCandidate({
      amountMinor: -3_000,
      transactionDate: d("2026-04-05"),
      alreadyMatchedTransactionIds: new Set(),
      candidates: [
        {
          id: "tx-exact",
          amountMinor: -3_000,
          date: d("2026-04-05"),
          clearingStatus: "UNCLEARED",
        },
      ],
    })

    expect(result?.candidateId).toBe("tx-exact")
    expect(result?.score).toBe(1)
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
          clearingStatus: "CLEARED",
        },
        {
          id: "tx-uncleared",
          amountMinor: -2_500,
          date: d("2026-04-01"),
          clearingStatus: "UNCLEARED",
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
          clearingStatus: "UNCLEARED",
        },
        {
          id: "tx-far",
          amountMinor: -4_200,
          date: d("2026-04-15"),
          clearingStatus: "UNCLEARED",
        },
        {
          id: "tx-mismatch",
          amountMinor: -4_100,
          date: d("2026-04-02"),
          clearingStatus: "UNCLEARED",
        },
      ],
    })

    expect(result).toBeNull()
  })
})
