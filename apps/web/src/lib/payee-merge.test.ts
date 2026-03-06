import { describe, expect, it } from "vitest"

import { isPayeeMergeSelectionValid } from "./payee-merge.js"

describe("isPayeeMergeSelectionValid", () => {
  it("rejects blank selections", () => {
    expect(isPayeeMergeSelectionValid("", "target")).toBe(false)
    expect(isPayeeMergeSelectionValid("source", "")).toBe(false)
  })

  it("rejects source and target being the same", () => {
    expect(isPayeeMergeSelectionValid("payee-1", "payee-1")).toBe(false)
  })

  it("accepts distinct source and target payees", () => {
    expect(isPayeeMergeSelectionValid("payee-1", "payee-2")).toBe(true)
  })
})
