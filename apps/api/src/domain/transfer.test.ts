import { describe, expect, it } from "vitest"

import { toMirrorTransferAmountMinor } from "./transfer.js"

describe("transfer domain helpers", () => {
  it("mirrors transfer amount sign", () => {
    expect(toMirrorTransferAmountMinor(-7_250)).toBe(7_250)
    expect(toMirrorTransferAmountMinor(7_250)).toBe(-7_250)
  })
})
