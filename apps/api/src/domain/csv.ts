import { parse } from "csv-parse/sync"

export type CsvRecord = Record<string, string>
export type CsvColumnMapping = {
  date: string
  amount: string
  payee: string
  note?: string
}

export const parseCsvRecords = (csvText: string): CsvRecord[] => {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    bom: true,
  }) as Record<string, unknown>[]

  return records.map((record) => {
    const output: CsvRecord = {}

    for (const [key, value] of Object.entries(record)) {
      output[key] = String(value ?? "")
    }

    return output
  })
}

export const findMissingMappedColumns = (
  rows: CsvRecord[],
  mapping: CsvColumnMapping,
) => {
  if (rows.length === 0) {
    return []
  }

  const firstRow = rows[0]
  if (!firstRow) {
    return []
  }

  const configuredColumns = [
    mapping.date,
    mapping.amount,
    mapping.payee,
    mapping.note,
  ].filter((column): column is string => Boolean(column?.trim()))

  return configuredColumns.filter(
    (columnName) => !Object.hasOwn(firstRow, columnName),
  )
}
