import {
  ImportBatchStatus,
  ImportRowAction,
  OriginType,
  prisma,
} from "@money/db"
import { Effect } from "effect"
import { findBestImportCandidate } from "../domain/import-matching.js"

type ImportInput = {
  accountId: string
  fileName: string
  csvText: string
  mapping: {
    date: string
    amount: string
    payee: string
    note?: string
  }
}

type ParsedCsvRow = Record<string, string>

const parseCsvText = (csvText: string): ParsedCsvRow[] => {
  const lines = csvText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const headerLine = lines[0]
  const rowLines = lines.slice(1)

  if (!headerLine) {
    return []
  }

  const headers = headerLine
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, ""))

  return rowLines.map((line) => {
    const rowValues = line
      .split(",")
      .map((value) => value.trim())
      .map((value) => value.replace(/^"|"$/g, ""))
    const row: ParsedCsvRow = {}

    for (const [index, header] of headers.entries()) {
      row[header] = rowValues[index] ?? ""
    }

    return row
  })
}

const parseAmountMinor = (rawAmount: string) => {
  const cleaned = rawAmount.replace(/[$,\s]/gu, "")
  const amount = Number(cleaned)

  if (Number.isNaN(amount)) {
    return 0
  }

  return Math.round(amount * 100)
}

const parseDate = (rawDate: string): Date => {
  const normalized = rawDate.trim()

  if (/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    return new Date(`${normalized}T00:00:00.000Z`)
  }

  const [partOne, partTwo, partThree] = normalized.split(/[/-]/u)

  if (partOne && partTwo && partThree) {
    // Supports MM/DD/YYYY and DD/MM/YYYY by favoring year part location.
    if (partThree.length === 4) {
      const month = Number(partOne)
      const day = Number(partTwo)
      const year = Number(partThree)
      return new Date(Date.UTC(year, month - 1, day))
    }
  }

  return new Date(normalized)
}

const normalizePayee = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/gu, " ")

export const importTransactionsFromCsv = (input: ImportInput) =>
  Effect.tryPromise({
    try: async () => {
      const rows = parseCsvText(input.csvText)
      const importBatch = await prisma.importBatch.create({
        data: {
          accountId: input.accountId,
          fileName: input.fileName,
          rowsTotal: rows.length,
          status: ImportBatchStatus.PENDING,
        },
      })

      let rowsMatched = 0
      let rowsCreated = 0
      const matchedTransactionIds = new Set<string>()

      for (const [index, row] of rows.entries()) {
        const amountMinor = parseAmountMinor(row[input.mapping.amount] ?? "")
        const date = parseDate(row[input.mapping.date] ?? "")
        const payeeName = (row[input.mapping.payee] ?? "").trim()
        const note = input.mapping.note
          ? (row[input.mapping.note] ?? "").trim()
          : ""

        const candidates = await prisma.transaction.findMany({
          where: {
            accountId: input.accountId,
            amountMinor,
            manualCreated: true,
            date: {
              gte: new Date(date.getTime() - 3 * 24 * 60 * 60 * 1000),
              lte: new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000),
            },
          },
          include: { origins: true },
        })

        const bestMatchResult = findBestImportCandidate({
          candidates,
          amountMinor,
          transactionDate: date,
          alreadyMatchedTransactionIds: matchedTransactionIds,
        })

        if (bestMatchResult) {
          matchedTransactionIds.add(bestMatchResult.candidateId)
          rowsMatched += 1

          await prisma.$transaction([
            prisma.transaction.update({
              where: { id: bestMatchResult.candidateId },
              data: {
                cleared: true,
                importLinked: true,
              },
            }),
            prisma.transactionOrigin.create({
              data: {
                transactionId: bestMatchResult.candidateId,
                originType: OriginType.CSV_IMPORT,
                importBatchId: importBatch.id,
                rawPayload: row,
              },
            }),
            prisma.importRowMatch.create({
              data: {
                importBatchId: importBatch.id,
                rowIndex: index,
                matchedTransactionId: bestMatchResult.candidateId,
                matchScore: bestMatchResult.score,
                matchReason: "Matched by exact amount and ±3 day window.",
                action: ImportRowAction.MERGED,
              },
            }),
          ])

          continue
        }

        let payeeId: string | undefined

        if (payeeName) {
          const normalizedName = normalizePayee(payeeName)
          const existingPayee = await prisma.payee.findFirst({
            where: { normalizedName },
          })

          if (existingPayee) {
            payeeId = existingPayee.id
          } else {
            const createdPayee = await prisma.payee.create({
              data: {
                name: payeeName,
                normalizedName,
              },
            })
            payeeId = createdPayee.id
          }
        }

        const createdTransaction = await prisma.transaction.create({
          data: {
            accountId: input.accountId,
            date,
            amountMinor,
            payeeId,
            note: note || undefined,
            cleared: true,
            manualCreated: false,
            importLinked: true,
          },
        })

        rowsCreated += 1

        await prisma.$transaction([
          prisma.transactionOrigin.create({
            data: {
              transactionId: createdTransaction.id,
              originType: OriginType.CSV_IMPORT,
              importBatchId: importBatch.id,
              rawPayload: row,
            },
          }),
          prisma.importRowMatch.create({
            data: {
              importBatchId: importBatch.id,
              rowIndex: index,
              matchedTransactionId: createdTransaction.id,
              action: ImportRowAction.CREATED,
            },
          }),
        ])
      }

      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: ImportBatchStatus.PROCESSED,
          rowsMatched,
          rowsCreated,
        },
      })

      return {
        importBatchId: importBatch.id,
        rowsTotal: rows.length,
        rowsMatched,
        rowsCreated,
      }
    },
    catch: (error) =>
      new Error(`Unable to import transactions: ${String(error)}`),
  })
