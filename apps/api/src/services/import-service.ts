import {
  ImportBatchStatus,
  ImportRowAction,
  OriginType,
  prisma,
} from "@money/db"
import { Effect } from "effect"
import { parseCsvRecords } from "../domain/csv.js"
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

const parseAmountMinor = (rawAmount: string): number | null => {
  const cleaned = rawAmount.replace(/[$,\s]/gu, "")

  if (!cleaned.length) {
    return null
  }

  const amount = Number(cleaned)

  if (Number.isNaN(amount)) {
    return null
  }

  return Math.round(amount * 100)
}

const parseDate = (rawDate: string): Date | null => {
  const normalized = rawDate.trim()

  if (/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    const parsed = new Date(`${normalized}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
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

  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

const normalizePayee = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/gu, " ")

export const importTransactionsFromCsv = (input: ImportInput) =>
  Effect.tryPromise({
    try: async () => {
      const rows = parseCsvRecords(input.csvText)
      const mappingColumns = [
        input.mapping.date,
        input.mapping.amount,
        input.mapping.payee,
        input.mapping.note,
      ].filter((column): column is string => Boolean(column?.trim()))

      const missingColumns = mappingColumns.filter(
        (columnName) =>
          rows.length > 0 && !Object.hasOwn(rows[0] ?? {}, columnName),
      )

      if (missingColumns.length > 0) {
        throw new Error(
          `CSV mapping columns not found: ${missingColumns.join(", ")}`,
        )
      }

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
      let rowsSkipped = 0
      const matchedTransactionIds = new Set<string>()

      for (const [index, row] of rows.entries()) {
        const amountMinor = parseAmountMinor(row[input.mapping.amount] ?? "")
        const date = parseDate(row[input.mapping.date] ?? "")

        if (amountMinor === null || date === null) {
          rowsSkipped += 1
          await prisma.importRowMatch.create({
            data: {
              importBatchId: importBatch.id,
              rowIndex: index,
              action: ImportRowAction.SKIPPED,
              matchReason: "Skipped row with invalid amount or date format.",
            },
          })
          continue
        }

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
          rowsSkipped,
        },
      })

      return {
        importBatchId: importBatch.id,
        rowsTotal: rows.length,
        rowsMatched,
        rowsCreated,
        rowsSkipped,
      }
    },
    catch: (error) =>
      new Error(`Unable to import transactions: ${String(error)}`),
  })
