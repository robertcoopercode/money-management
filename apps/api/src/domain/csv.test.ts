import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { findMissingMappedColumns, parseCsvRecords } from "./csv.js"

describe("parseCsvRecords", () => {
  it("parses default header-based csv rows", () => {
    const rows = parseCsvRecords("date,amount,payee\n2026-01-01,-10.00,Coffee")

    expect(rows).toEqual([
      {
        date: "2026-01-01",
        amount: "-10.00",
        payee: "Coffee",
      },
    ])
  })

  it("supports quoted values with commas", () => {
    const rows = parseCsvRecords(
      'date,amount,payee,note\n2026-01-01,-20.00,"Store, Downtown","tea, milk"',
    )

    expect(rows[0]).toEqual({
      date: "2026-01-01",
      amount: "-20.00",
      payee: "Store, Downtown",
      note: "tea, milk",
    })
  })

  it("reports missing mapping columns", () => {
    const rows = parseCsvRecords(
      "bookingDate,amount,payee\n2026-01-01,-10.00,Coffee",
    )

    const missingColumns = findMissingMappedColumns(rows, {
      date: "date",
      amount: "amount",
      payee: "payee",
      note: "note",
    })

    expect(missingColumns).toEqual(["date", "note"])
  })
})

describe("parseCsvRecords with sample CSV", () => {
  const sampleCsvPath = resolve(
    import.meta.dirname,
    "../../../../csv-sample-data/jan-transactions.csv",
  )
  const csvText = readFileSync(sampleCsvPath, "utf-8")

  it("parses 85 rows from the sample CSV", () => {
    const rows = parseCsvRecords(csvText)
    expect(rows.length).toBe(85)
  })

  it("parses negative amounts correctly", () => {
    const rows = parseCsvRecords(csvText)
    // First row: "-16.09" → should parse to string "-16.09"
    expect(rows[0]?.amount).toBe("-16.09")
  })

  it("parses positive amounts correctly", () => {
    const rows = parseCsvRecords(csvText)
    // Row with payroll: "4128.31"
    const payrollRow = rows.find((r) => r.payee === "Basedash")
    expect(payrollRow?.amount).toBe("4128.31")
  })

  it("parses dates correctly", () => {
    const rows = parseCsvRecords(csvText)
    // The CSV file has quoted headers; csv-parse strips quotes but may have BOM
    const firstRow = rows[0]!
    const keys = Object.keys(firstRow)
    const dateKey = keys.find((k) => k.endsWith("date"))!
    expect(firstRow[dateKey]).toBe("2026-01-31")
  })

  it("has expected columns (payee, amount, notes)", () => {
    const rows = parseCsvRecords(csvText)
    const firstRow = rows[0]!
    const keys = Object.keys(firstRow)
    // Headers may have BOM prefix on first column
    expect(keys.some((k) => k.endsWith("date"))).toBe(true)
    expect(firstRow).toHaveProperty("amount")
    expect(firstRow).toHaveProperty("payee")
    expect(firstRow).toHaveProperty("notes")
  })
})
