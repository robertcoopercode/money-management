import { describe, expect, it } from "vitest"

import {
  filterPayeesByName,
  findPayeeByExactName,
  normalizePayeeName,
  shouldSuggestPayeeCreation,
} from "./payee-entry.js"

const payees = [
  { id: "1", name: "Walmart" },
  { id: "2", name: "Whole Foods" },
  { id: "3", name: "Fuel Plus" },
]

describe("payee entry helpers", () => {
  it("normalizes casing and extra whitespace for comparison", () => {
    expect(normalizePayeeName("  WHOLE    foods  ")).toBe("whole foods")
  })

  it("finds exact payees with case-insensitive matching", () => {
    const match = findPayeeByExactName(payees, "  walmart ")

    expect(match?.id).toBe("1")
  })

  it("filters payees by the search query", () => {
    expect(filterPayeesByName(payees, "wh")).toEqual([
      { id: "2", name: "Whole Foods" },
    ])
  })

  it("suggests payee creation only when there is no exact match", () => {
    expect(shouldSuggestPayeeCreation(payees, "Fuel Plus")).toBe(false)
    expect(shouldSuggestPayeeCreation(payees, "Fuel Plus East")).toBe(true)
    expect(shouldSuggestPayeeCreation(payees, "   ")).toBe(false)
  })
})
