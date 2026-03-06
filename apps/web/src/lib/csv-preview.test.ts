import { describe, expect, it } from "vitest"

import { buildCsvPreview, splitCsvLine } from "./csv-preview.js"

describe("splitCsvLine", () => {
  it("splits comma-separated values", () => {
    expect(splitCsvLine("date,amount,payee")).toEqual([
      "date",
      "amount",
      "payee",
    ])
  })

  it("supports quoted commas", () => {
    expect(splitCsvLine('"Store, Downtown",-10.00')).toEqual([
      "Store, Downtown",
      "-10.00",
    ])
  })
})

describe("buildCsvPreview", () => {
  it("returns null for insufficient rows", () => {
    expect(buildCsvPreview("date,amount,payee")).toBeNull()
  })

  it("returns headers and first five rows", () => {
    const preview = buildCsvPreview(
      "date,amount,payee\n2026-01-01,-10,Coffee\n2026-01-02,-20,Groceries\n2026-01-03,1000,Paycheck\n2026-01-04,-30,Gas\n2026-01-05,-40,Utilities\n2026-01-06,-50,Dining",
    )

    expect(preview?.headers).toEqual(["date", "amount", "payee"])
    expect(preview?.rows).toHaveLength(5)
    expect(preview?.rows[0]).toEqual(["2026-01-01", "-10", "Coffee"])
    expect(preview?.rows[4]).toEqual(["2026-01-05", "-40", "Utilities"])
  })
})
