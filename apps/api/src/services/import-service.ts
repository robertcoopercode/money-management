import {
  ImportBatchStatus,
  ImportRowAction,
  OriginType,
  prisma,
} from "@ledgr/db"
import { Effect } from "effect"
import { findMissingMappedColumns, parseCsvRecords } from "../domain/csv.js"
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
  swapInflowOutflow?: boolean
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

const DAY_MS = 24 * 60 * 60 * 1000

export const importTransactionsFromCsv = (input: ImportInput) =>
  Effect.tryPromise({
    try: async () => {
      const rows = parseCsvRecords(input.csvText)
      const missingColumns = findMissingMappedColumns(rows, input.mapping)

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
        let amountMinor = parseAmountMinor(row[input.mapping.amount] ?? "")
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

        if (input.swapInflowOutflow) {
          amountMinor = amountMinor * -1
        }

        const payeeName = (row[input.mapping.payee] ?? "").trim()
        const note = input.mapping.note
          ? (row[input.mapping.note] ?? "").trim()
          : ""
        const normalizedPayeeName = normalizePayee(payeeName)

        // Dedup check: look for existing ImportedTransaction with same date + amount + payee + note
        const existingImport = await prisma.importedTransaction.findFirst({
          where: {
            date,
            amountMinor,
            payeeName: normalizedPayeeName,
            note: note || null,
            importBatch: { accountId: input.accountId },
          },
        })

        if (existingImport) {
          rowsSkipped += 1
          await prisma.importRowMatch.create({
            data: {
              importBatchId: importBatch.id,
              rowIndex: index,
              action: ImportRowAction.SKIPPED,
              matchReason: "Duplicate of previously imported transaction.",
            },
          })
          continue
        }

        // Create ImportedTransaction for dedup tracking
        const importedTransaction = await prisma.importedTransaction.create({
          data: {
            importBatchId: importBatch.id,
            rowIndex: index,
            date,
            amountMinor,
            payeeName: normalizedPayeeName,
            note: note || null,
            rawPayload: row,
          },
        })

        // Find match candidates: existing transactions with exact amount within ±10 day window
        const candidates = await prisma.transaction.findMany({
          where: {
            accountId: input.accountId,
            amountMinor,
            importedTransactionId: null,
            date: {
              gte: new Date(date.getTime() - 10 * DAY_MS),
              lte: new Date(date.getTime() + 10 * DAY_MS),
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
                clearingStatus: "CLEARED",
                pendingApproval: true,
                importedTransactionId: importedTransaction.id,
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
                matchReason: "Matched by exact amount and ±10 day window.",
                action: ImportRowAction.MERGED,
              },
            }),
          ])

          continue
        }

        // No match — find/create payee and create new transaction
        let payeeId: string | undefined
        let categoryId: string | undefined

        if (payeeName) {
          const existingPayee = await prisma.payee.findFirst({
            where: { normalizedName: normalizedPayeeName },
          })

          if (existingPayee) {
            payeeId = existingPayee.id
            if (existingPayee.defaultCategoryId) {
              categoryId = existingPayee.defaultCategoryId
            }
          } else {
            const createdPayee = await prisma.payee.create({
              data: {
                name: payeeName,
                normalizedName: normalizedPayeeName,
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
            categoryId,
            note: note || undefined,
            cleared: true,
            manualCreated: false,
            pendingApproval: true,
            importedTransactionId: importedTransaction.id,
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
