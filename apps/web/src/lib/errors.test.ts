import { describe, expect, it } from "vitest"

import { toDisplayErrorMessage } from "./errors.js"

describe("toDisplayErrorMessage", () => {
  it("returns error message for Error instances", () => {
    expect(
      toDisplayErrorMessage(new Error("Request failed with 500"), "Fallback"),
    ).toBe("Request failed with 500")
  })

  it("returns fallback for unknown errors", () => {
    expect(toDisplayErrorMessage("boom", "Fallback")).toBe("Fallback")
  })
})
