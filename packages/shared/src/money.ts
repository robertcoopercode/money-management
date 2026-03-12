export const formatMoney = (amountMinor: number, currency = "CAD"): string => {
  const amount = (amountMinor || 0) / 100
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount)
}

export const parseMoneyInputToMinor = (value: string): number => {
  const normalized = value.replace(/[$,\s]/g, "")
  const parsed = Number(normalized)

  if (Number.isNaN(parsed)) {
    return 0
  }

  return Math.round(parsed * 100)
}
