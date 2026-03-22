import type { CategoryReportResponse } from "@ledgr/shared"

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`

export type ReportingCategory = {
  name: string
  group?: {
    id: string
    name: string
  } | null
} | null

export type ReportingSplit = {
  categoryId: string
  amountMinor: number
  category: ReportingCategory
}

export type ReportingTransactionInput = {
  date: Date
  amountMinor: number
  categoryId: string | null
  category: ReportingCategory
  splits?: ReportingSplit[]
}

const addCategorySpending = (
  map: Map<string, {
    categoryId: string
    groupName: string
    categoryName: string
    totalMinor: number
  }>,
  categoryId: string | null,
  category: ReportingCategory,
  amountMinor: number,
) => {
  if (amountMinor >= 0) return
  const key = categoryId ?? "uncategorized"
  const existing = map.get(key)
  map.set(key, {
    categoryId: key,
    groupName: category?.group?.name ?? "Uncategorized",
    categoryName: category?.name ?? "Uncategorized",
    totalMinor: (existing?.totalMinor ?? 0) + Math.abs(amountMinor),
  })
}

function generateMonthRange(fromDate: Date, toDate: Date): string[] {
  const months: string[] = []
  const current = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1))
  const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1))
  while (current <= end) {
    months.push(monthKey(current))
    current.setUTCMonth(current.getUTCMonth() + 1)
  }
  return months
}

type CategoryBucket = {
  categoryId: string
  categoryName: string
  groupId: string | null
  groupName: string
  isIncomeCategory: boolean
  monthlyAmounts: Map<string, number>
  totalMinor: number
  count: number
}

function bucketAmount(
  buckets: Map<string, CategoryBucket>,
  categoryId: string | null,
  category: ReportingCategory,
  amountMinor: number,
  month: string,
) {
  const key = categoryId ?? "uncategorized"
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = {
      categoryId: key,
      categoryName: category?.name ?? "Uncategorized",
      groupId: category?.group?.id ?? null,
      groupName: category?.group?.name ?? "Ungrouped",
      isIncomeCategory: false,
      monthlyAmounts: new Map(),
      totalMinor: 0,
      count: 0,
    }
    buckets.set(key, bucket)
  }
  bucket.monthlyAmounts.set(month, (bucket.monthlyAmounts.get(month) ?? 0) + amountMinor)
  bucket.totalMinor += amountMinor
  bucket.count += 1
}

export const aggregateCategoryReport = (
  transactions: ReportingTransactionInput[],
  fromDate: Date,
  toDate: Date,
): CategoryReportResponse => {
  const months = generateMonthRange(fromDate, toDate)
  const buckets = new Map<string, CategoryBucket>()

  for (const tx of transactions) {
    const month = monthKey(tx.date)
    if (tx.splits && tx.splits.length > 0) {
      for (const split of tx.splits) {
        bucketAmount(buckets, split.categoryId, split.category, split.amountMinor, month)
      }
    } else {
      bucketAmount(buckets, tx.categoryId, tx.category, tx.amountMinor, month)
    }
  }

  // Mark income categories (net positive total)
  for (const bucket of buckets.values()) {
    bucket.isIncomeCategory = bucket.totalMinor > 0
  }

  // Group by groupName
  const groupMap = new Map<string, { groupId: string | null; groupName: string; categories: CategoryBucket[] }>()
  for (const bucket of buckets.values()) {
    const gKey = bucket.groupId ?? bucket.groupName
    let group = groupMap.get(gKey)
    if (!group) {
      group = { groupId: bucket.groupId, groupName: bucket.groupName, categories: [] }
      groupMap.set(gKey, group)
    }
    group.categories.push(bucket)
  }

  // Sort: expense groups alphabetically, income groups at end
  const groups = [...groupMap.values()]
    .map((g) => {
      const hasIncome = g.categories.some((c) => c.isIncomeCategory)
      return { ...g, hasIncome }
    })
    .sort((a, b) => {
      if (a.hasIncome !== b.hasIncome) return a.hasIncome ? 1 : -1
      return a.groupName.localeCompare(b.groupName)
    })
    .map(({ hasIncome: _, ...g }) => ({
      ...g,
      categories: g.categories
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
        .map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          isIncomeCategory: c.isIncomeCategory,
          monthlyAmounts: Object.fromEntries(c.monthlyAmounts),
          totalMinor: c.totalMinor,
          count: c.count,
        })),
    }))

  return { months, groups }
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
    if (transaction.splits && transaction.splits.length > 0) {
      for (const split of transaction.splits) {
        addCategorySpending(
          spendingByCategory,
          split.categoryId,
          split.category,
          split.amountMinor,
        )
      }
    } else {
      addCategorySpending(
        spendingByCategory,
        transaction.categoryId,
        transaction.category,
        transaction.amountMinor,
      )
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
