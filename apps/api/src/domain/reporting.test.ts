import { describe, expect, it } from "vitest"

import { aggregateReportingMetrics } from "./reporting.js"

describe("aggregateReportingMetrics", () => {
  it("aggregates category spending, monthly totals, and balance trend", () => {
    const result = aggregateReportingMetrics({
      startingBalanceMinorTotal: 100_000,
      transactions: [
        {
          date: new Date("2026-01-10T00:00:00.000Z"),
          amountMinor: 250_000,
          categoryId: "income",
          category: { name: "Ready to Assign", group: { name: "Income" } },
        },
        {
          date: new Date("2026-01-12T00:00:00.000Z"),
          amountMinor: -12_500,
          categoryId: "groceries",
          category: {
            name: "Groceries & Household",
            group: { name: "Food" },
          },
        },
        {
          date: new Date("2026-02-05T00:00:00.000Z"),
          amountMinor: -50_000,
          categoryId: "mortgage",
          category: { name: "Mortgage", group: { name: "Fixed / Annual" } },
        },
      ],
    })

    expect(result.spendingByCategory).toEqual([
      {
        categoryId: "mortgage",
        groupName: "Fixed / Annual",
        categoryName: "Mortgage",
        totalMinor: 50_000,
      },
      {
        categoryId: "groceries",
        groupName: "Food",
        categoryName: "Groceries & Household",
        totalMinor: 12_500,
      },
    ])

    expect(result.incomeExpenseByMonth).toEqual([
      {
        month: "2026-01",
        incomeMinor: 250_000,
        expenseMinor: 12_500,
      },
      {
        month: "2026-02",
        incomeMinor: 0,
        expenseMinor: 50_000,
      },
    ])

    expect(result.accountBalanceTrend).toEqual([
      {
        month: "2026-01",
        balanceMinor: 337_500,
      },
      {
        month: "2026-02",
        balanceMinor: 287_500,
      },
    ])
  })
})
