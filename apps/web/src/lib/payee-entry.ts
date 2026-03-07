export type PayeeOption = {
  id: string
  name: string
}

export const normalizePayeeName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ")

export const findPayeeByExactName = (
  payees: PayeeOption[],
  rawPayeeName: string,
) => {
  const normalizedName = normalizePayeeName(rawPayeeName)

  if (!normalizedName) {
    return undefined
  }

  return payees.find(
    (payee) => normalizePayeeName(payee.name) === normalizedName,
  )
}

export const filterPayeesByName = (
  payees: PayeeOption[],
  rawQuery: string,
  maxResults = 8,
) => {
  const normalizedQuery = normalizePayeeName(rawQuery)
  const filtered = normalizedQuery
    ? payees.filter((payee) =>
        normalizePayeeName(payee.name).includes(normalizedQuery),
      )
    : payees

  return filtered.slice(0, maxResults)
}

export const shouldSuggestPayeeCreation = (
  payees: PayeeOption[],
  rawPayeeName: string,
) => {
  const normalizedName = normalizePayeeName(rawPayeeName)
  if (!normalizedName) {
    return false
  }

  return !findPayeeByExactName(payees, rawPayeeName)
}
