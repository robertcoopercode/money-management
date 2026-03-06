import { describe, expect, it } from "vitest"

import { parseCsvRecords } from "./csv.js"

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
})
