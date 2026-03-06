import { parse } from "csv-parse/sync"

export type CsvRecord = Record<string, string>

export const parseCsvRecords = (csvText: string): CsvRecord[] => {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  }) as Record<string, unknown>[]

  return records.map((record) => {
    const output: CsvRecord = {}

    for (const [key, value] of Object.entries(record)) {
      output[key] = String(value ?? "")
    }

    return output
  })
}
