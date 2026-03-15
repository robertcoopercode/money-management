export type CsvPreview = {
  headers: string[]
  rows: string[][]
}

export const splitCsvLine = (line: string) => {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

export const parseCsvFile = async (file: File) => {
  return file.text()
}

const FIELD_PATTERNS: Record<string, string[]> = {
  date: ["date", "transaction date", "trans date", "posting date", "posted date"],
  amount: ["amount", "total", "sum", "debit", "credit"],
  payee: ["payee", "description", "merchant", "name", "vendor"],
  note: ["note", "notes", "memo", "reference", "comment", "description"],
}

export const guessColumnMapping = (
  headers: string[],
): { date: string; amount: string; payee: string; note: string } => {
  const result = { date: "", amount: "", payee: "", note: "" }
  const claimed = new Set<string>()

  for (const field of ["date", "amount", "payee", "note"] as const) {
    const patterns = FIELD_PATTERNS[field]
    for (const pattern of patterns) {
      const match = headers.find(
        (h) => h.toLowerCase() === pattern && !claimed.has(h),
      )
      if (match) {
        result[field] = match
        claimed.add(match)
        break
      }
    }
  }

  return result
}

export const buildCsvPreview = (csvText: string): CsvPreview | null => {
  const lines = csvText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return null
  }

  const headerLine = lines[0]

  if (!headerLine) {
    return null
  }

  const headers = splitCsvLine(headerLine)
  const rows = lines
    .slice(1)
    .map((line) => splitCsvLine(line))
    .filter((row) => row.length > 0)

  return {
    headers,
    rows,
  }
}
