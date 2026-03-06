import { describe, expect, it } from "vitest"

import {
  calculateCategoryAvailableMinor,
  calculateReadyToAssignMinor,
} from "./planning.js"

describe("planning calculations", () => {
  it("calculates category available including prior carryover", () => {
    const availableMinor = calculateCategoryAvailableMinor({
      priorAssignedMinor: 50_000,
      priorActivityMinor: -20_000,
      assignedMinor: 15_000,
      activityMinor: -8_500,
    })

    expect(availableMinor).toBe(36_500)
  })

  it("calculates ready to assign as income minus assigned", () => {
    const readyToAssignMinor = calculateReadyToAssignMinor({
      incomeThroughMonthMinor: 420_000,
      assignedThroughMonthMinor: 315_500,
    })

    expect(readyToAssignMinor).toBe(104_500)
  })
})
