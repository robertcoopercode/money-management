import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
  format,
} from "date-fns"

export const REPORT_PRESETS = [
  { value: "this_month", label: "This Month" },
  { value: "this_year", label: "This Year" },
  { value: "month_to_date", label: "Month to Date" },
  { value: "year_to_date", label: "Year to Date" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "last_12_months", label: "Last 12 Months" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom" },
] as const

export type ReportPreset = (typeof REPORT_PRESETS)[number]["value"]

export const DEFAULT_PRESET: ReportPreset = "last_6_months"

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function computeDateRange(
  preset: ReportPreset,
  customFrom?: string,
  customTo?: string,
): { fromDate: string; toDate: string } {
  const today = new Date()

  switch (preset) {
    case "this_month":
      return { fromDate: toIso(startOfMonth(today)), toDate: toIso(endOfMonth(today)) }
    case "this_year":
      return { fromDate: toIso(startOfYear(today)), toDate: toIso(endOfYear(today)) }
    case "month_to_date":
      return { fromDate: toIso(startOfMonth(today)), toDate: toIso(today) }
    case "year_to_date":
      return { fromDate: toIso(startOfYear(today)), toDate: toIso(today) }
    case "last_7_days":
      return { fromDate: toIso(subDays(today, 6)), toDate: toIso(today) }
    case "last_30_days":
      return { fromDate: toIso(subDays(today, 29)), toDate: toIso(today) }
    case "last_month": {
      const prev = subMonths(today, 1)
      return { fromDate: toIso(startOfMonth(prev)), toDate: toIso(endOfMonth(prev)) }
    }
    case "last_3_months": {
      const start = startOfMonth(subMonths(today, 2))
      return { fromDate: toIso(start), toDate: toIso(endOfMonth(today)) }
    }
    case "last_6_months": {
      const start = startOfMonth(subMonths(today, 5))
      return { fromDate: toIso(start), toDate: toIso(endOfMonth(today)) }
    }
    case "last_12_months": {
      const start = startOfMonth(subMonths(today, 11))
      return { fromDate: toIso(start), toDate: toIso(endOfMonth(today)) }
    }
    case "last_year": {
      const prev = subYears(today, 1)
      return { fromDate: toIso(startOfYear(prev)), toDate: toIso(endOfYear(prev)) }
    }
    case "custom":
      return {
        fromDate: customFrom ?? toIso(startOfMonth(subMonths(today, 5))),
        toDate: customTo ?? toIso(endOfMonth(today)),
      }
  }
}

export function formatRangeLabel(fromDate: string, toDate: string): string {
  const from = format(new Date(fromDate + "T00:00:00"), "MMM d, yyyy")
  const to = format(new Date(toDate + "T00:00:00"), "MMM d, yyyy")
  return `${from} – ${to}`
}
