import type { ImportBatchStatus } from "../../src/generated/prisma/client.js"

export type ImportBatchSeed = {
  accountName: string
  fileName: string
  status: ImportBatchStatus
  rowsTotal: number
  rowsMatched: number
  rowsCreated: number
  rowsSkipped: number
}

export const importBatches: ImportBatchSeed[] = [
  {
    accountName: "CIBC Visa",
    fileName: "cibc-visa-statement-2026-01.csv",
    status: "PROCESSED",
    rowsTotal: 28,
    rowsMatched: 25,
    rowsCreated: 3,
    rowsSkipped: 0,
  },
  {
    accountName: "TD Chequing",
    fileName: "td-chequing-statement-2026-02.csv",
    status: "PROCESSED",
    rowsTotal: 18,
    rowsMatched: 15,
    rowsCreated: 2,
    rowsSkipped: 1,
  },
]
