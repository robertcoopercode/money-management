import { describe, expect, it } from "vitest"

import {
  buildMirrorTransferNote,
  toMirrorTransferAmountMinor,
} from "./transfer.js"

describe("transfer domain helpers", () => {
  it("mirrors transfer amount sign", () => {
    expect(toMirrorTransferAmountMinor(-7_250)).toBe(7_250)
    expect(toMirrorTransferAmountMinor(7_250)).toBe(-7_250)
  })

  it("builds readable mirror notes", () => {
    expect(buildMirrorTransferNote("Credit card payment")).toBe(
      "Transfer mirror: Credit card payment",
    )
    expect(buildMirrorTransferNote()).toBe("Transfer mirror entry")
  })
})
