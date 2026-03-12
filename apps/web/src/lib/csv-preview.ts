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
    .slice(1, 6)
    .map((line) => splitCsvLine(line))
    .filter((row) => row.length > 0)

  return {
    headers,
    rows,
  }
}
