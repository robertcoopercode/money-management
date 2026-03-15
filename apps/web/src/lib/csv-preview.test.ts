import { describe, expect, it } from "vitest"

import { buildCsvPreview, guessColumnMapping, splitCsvLine } from "./csv-preview.js"

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

describe("guessColumnMapping", () => {
  it("maps exact matches", () => {
    expect(guessColumnMapping(["date", "amount", "payee", "notes"])).toEqual({
      date: "date",
      amount: "amount",
      payee: "payee",
      note: "notes",
    })
  })

  it("maps variant headers", () => {
    expect(
      guessColumnMapping(["Transaction Date", "Total", "Merchant", "Reference"]),
    ).toEqual({
      date: "Transaction Date",
      amount: "Total",
      payee: "Merchant",
      note: "Reference",
    })
  })

  it("returns empty string when note column is missing", () => {
    const result = guessColumnMapping(["date", "amount", "payee"])
    expect(result.note).toBe("")
    expect(result.date).toBe("date")
    expect(result.amount).toBe("amount")
    expect(result.payee).toBe("payee")
  })

  it("assigns Description to payee and Memo to note", () => {
    const result = guessColumnMapping(["date", "amount", "Description", "Memo"])
    expect(result.payee).toBe("Description")
    expect(result.note).toBe("Memo")
  })

  it("is case insensitive", () => {
    expect(guessColumnMapping(["DATE", "Amount", "PAYEE", "Note"])).toEqual({
      date: "DATE",
      amount: "Amount",
      payee: "PAYEE",
      note: "Note",
    })
  })

  it("returns all empty strings for unrecognizable headers", () => {
    expect(guessColumnMapping(["foo", "bar", "baz"])).toEqual({
      date: "",
      amount: "",
      payee: "",
      note: "",
    })
  })

  it("does not double-assign the same header", () => {
    // "description" matches both payee and note, but should only go to payee
    const result = guessColumnMapping(["date", "amount", "description"])
    expect(result.payee).toBe("description")
    expect(result.note).toBe("")
  })
})

describe("buildCsvPreview", () => {
  it("returns null for insufficient rows", () => {
    expect(buildCsvPreview("date,amount,payee")).toBeNull()
  })

  it("returns headers and all rows", () => {
    const preview = buildCsvPreview(
      "date,amount,payee\n2026-01-01,-10,Coffee\n2026-01-02,-20,Groceries\n2026-01-03,1000,Paycheck\n2026-01-04,-30,Gas\n2026-01-05,-40,Utilities\n2026-01-06,-50,Dining",
    )

    expect(preview?.headers).toEqual(["date", "amount", "payee"])
    expect(preview?.rows).toHaveLength(6)
    expect(preview?.rows[0]).toEqual(["2026-01-01", "-10", "Coffee"])
    expect(preview?.rows[5]).toEqual(["2026-01-06", "-50", "Dining"])
  })
})
