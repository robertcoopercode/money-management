import { describe, expect, it } from "vitest"

import { calculateMonthlyPaymentMinor } from "./mortgage.js"

describe("calculateMonthlyPaymentMinor", () => {
  it("calculates a stable payment for typical mortgage values", () => {
    const paymentMinor = calculateMonthlyPaymentMinor(450_000_00, 0.055, 300)

    expect(paymentMinor).toBe(276339)
  })

  it("handles zero interest correctly", () => {
    const paymentMinor = calculateMonthlyPaymentMinor(120_000_00, 0, 120)

    expect(paymentMinor).toBe(100_000)
  })
})
