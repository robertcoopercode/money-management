const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

export type ReportingCategory = {
  name: string
  group?: {
    name: string
  } | null
} | null

export type ReportingTransactionInput = {
  date: Date
  amountMinor: number
  categoryId: string | null
  category: ReportingCategory
}

export const aggregateReportingMetrics = ({
  transactions,
  startingBalanceMinorTotal,
}: {
  transactions: ReportingTransactionInput[]
  startingBalanceMinorTotal: number
}) => {
  const spendingByCategory = new Map<string, {
    categoryId: string
    groupName: string
    categoryName: string
    totalMinor: number
  }>()
  const incomeExpenseByMonth = new Map<string, {
    month: string
    incomeMinor: number
    expenseMinor: number
  }>()
  const balanceDeltaByMonth = new Map<string, number>()

  for (const transaction of transactions) {
    const categoryKey = transaction.categoryId ?? "uncategorized"
    const groupName = transaction.category?.group?.name ?? "Uncategorized"
    const categoryName = transaction.category?.name ?? "Uncategorized"
    const existingCategory = spendingByCategory.get(categoryKey)

    if (transaction.amountMinor < 0) {
      spendingByCategory.set(categoryKey, {
        categoryId: categoryKey,
        groupName,
        categoryName,
        totalMinor:
          (existingCategory?.totalMinor ?? 0) +
          Math.abs(transaction.amountMinor),
      })
    }

    const key = monthKey(transaction.date)
    const currentMonth = incomeExpenseByMonth.get(key) ?? {
      month: key,
      incomeMinor: 0,
      expenseMinor: 0,
    }

    if (transaction.amountMinor >= 0) {
      currentMonth.incomeMinor += transaction.amountMinor
    } else {
      currentMonth.expenseMinor += Math.abs(transaction.amountMinor)
    }

    incomeExpenseByMonth.set(key, currentMonth)
    balanceDeltaByMonth.set(
      key,
      (balanceDeltaByMonth.get(key) ?? 0) + transaction.amountMinor,
    )
  }

  const sortedBalanceMonths = [...balanceDeltaByMonth.keys()].sort((a, b) =>
    a.localeCompare(b),
  )

  let runningBalanceMinor = startingBalanceMinorTotal
  const accountBalanceTrend = sortedBalanceMonths.map((month) => {
    runningBalanceMinor += balanceDeltaByMonth.get(month) ?? 0
    return {
      month,
      balanceMinor: runningBalanceMinor,
    }
  })

  return {
    spendingByCategory: [...spendingByCategory.values()].sort(
      (a, b) => b.totalMinor - a.totalMinor,
    ),
    incomeExpenseByMonth: [...incomeExpenseByMonth.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
    accountBalanceTrend,
  }
}
