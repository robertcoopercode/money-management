import "../src/env.ts"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { generateNKeysBetween } from "@ledgr/shared"
import { accounts, loanProfiles } from "./seed/accounts.js"
import { categoryGroups } from "./seed/categories.js"
import { payees } from "./seed/payees.js"
import { tags } from "./seed/tags.js"
import { generateAllTransactions } from "./seed/transactions.js"
import { generateAssignments } from "./seed/assignments.js"
import { importBatches } from "./seed/imports.js"
import { monthsInRange, normalizeName, startOfRange } from "./seed/helpers.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

const main = async () => {
  const today = new Date()
  const monthKeys = monthsInRange(today)
  const rangeStart = startOfRange(today)

  console.log(`Seeding 6 months: ${monthKeys[0]} → ${monthKeys[5]}`)

  // Truncate all tables in dependency order
  console.log("Truncating tables...")
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "SplitTag",
      "TransactionSplit",
      "TransactionTag",
      "TransactionOrigin",
      "ImportRowMatch",
      "ImportedTransaction",
      "ImportBatch",
      "Transaction",
      "CategoryAssignment",
      "Category",
      "CategoryGroup",
      "Payee",
      "Tag",
      "LoanProfile",
      "Account"
    CASCADE
  `)

  // Seed category groups & categories
  console.log("Seeding categories...")
  const categoryMap = new Map<string, string>()
  const groupSortKeys = generateNKeysBetween(null, null, categoryGroups.length)

  for (const [groupIndex, group] of categoryGroups.entries()) {
    const createdGroup = await prisma.categoryGroup.create({
      data: { name: group.name, sortOrder: groupSortKeys[groupIndex] },
    })

    const categorySortKeys = generateNKeysBetween(null, null, group.categories.length)

    for (const [catIndex, cat] of group.categories.entries()) {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          groupId: createdGroup.id,
          isIncomeCategory: cat.isIncomeCategory ?? false,
          sortOrder: categorySortKeys[catIndex],
        },
      })
      categoryMap.set(cat.name, created.id)
    }
  }

  // Seed accounts
  console.log("Seeding accounts...")
  const accountMap = new Map<string, string>()
  for (const account of accounts) {
    const created = await prisma.account.create({
      data: {
        name: account.name,
        type: account.type,
        startingBalanceMinor: account.startingBalanceMinor,
        startingBalanceAt: rangeStart,
      },
    })
    accountMap.set(account.name, created.id)
  }

  // Seed loan profiles
  for (const lp of loanProfiles) {
    const accountId = accountMap.get(lp.accountName)!
    await prisma.loanProfile.create({
      data: {
        accountId,
        loanType: lp.loanType,
        interestRateAnnual: lp.interestRateAnnual,
        minimumPaymentMinor: lp.minimumPaymentMinor,
      },
    })
  }

  // Seed payees
  console.log("Seeding payees...")
  const payeeMap = new Map<string, string>()
  for (const p of payees) {
    const created = await prisma.payee.create({
      data: {
        name: p.name,
        normalizedName: normalizeName(p.name),
        defaultCategoryId: p.defaultCategoryName ? categoryMap.get(p.defaultCategoryName) ?? null : null,
      },
    })
    payeeMap.set(p.name, created.id)
  }

  // Seed tags
  console.log("Seeding tags...")
  const tagMap = new Map<string, string>()
  for (const t of tags) {
    const created = await prisma.tag.create({
      data: {
        name: t.name,
        normalizedName: t.normalizedName,
        description: t.description,
        backgroundColor: t.backgroundColor,
        textColor: t.textColor,
      },
    })
    tagMap.set(t.name, created.id)
  }

  // Seed transactions
  console.log("Seeding transactions...")
  const allTxs = generateAllTransactions(monthKeys, today)
  let txCount = 0
  let splitCount = 0
  let tagCount = 0

  for (const tx of allTxs) {
    const accountId = accountMap.get(tx.accountName)
    if (!accountId) {
      console.warn(`Skipping tx: unknown account "${tx.accountName}"`)
      continue
    }

    const created = await prisma.transaction.create({
      data: {
        accountId,
        date: tx.date,
        amountMinor: tx.amountMinor,
        payeeId: tx.payeeName ? payeeMap.get(tx.payeeName) ?? null : null,
        categoryId: tx.categoryName ? categoryMap.get(tx.categoryName) ?? null : null,
        note: tx.note,
        clearingStatus: tx.clearingStatus,
        isTransfer: tx.isTransfer,
        transferAccountId: tx.transferAccountName ? accountMap.get(tx.transferAccountName) ?? null : null,
        transferPairId: tx.transferPairId,
        origins: {
          create: { originType: "MANUAL" },
        },
      },
    })
    txCount++

    // Create tags
    for (const tagName of tx.tagNames) {
      const tagId = tagMap.get(tagName)
      if (tagId) {
        await prisma.transactionTag.create({
          data: { transactionId: created.id, tagId },
        })
        tagCount++
      }
    }

    // Create splits
    if (tx.splits) {
      for (const [i, split] of tx.splits.entries()) {
        await prisma.transactionSplit.create({
          data: {
            transactionId: created.id,
            categoryId: categoryMap.get(split.categoryName)!,
            payeeId: split.payeeName ? payeeMap.get(split.payeeName) ?? null : null,
            note: split.note ?? null,
            amountMinor: split.amountMinor,
            sortOrder: i,
          },
        })
        splitCount++
      }
    }
  }

  // Seed category assignments
  console.log("Seeding budget assignments...")
  const assignments = generateAssignments(monthKeys)
  let assignmentCount = 0

  for (const a of assignments) {
    const categoryId = categoryMap.get(a.categoryName)
    if (categoryId) {
      await prisma.categoryAssignment.create({
        data: {
          month: a.month,
          categoryId,
          assignedMinor: a.assignedMinor,
        },
      })
      assignmentCount++
    }
  }

  // Seed import batches
  console.log("Seeding import batches...")
  for (const ib of importBatches) {
    const accountId = accountMap.get(ib.accountName)
    if (accountId) {
      await prisma.importBatch.create({
        data: {
          accountId,
          fileName: ib.fileName,
          status: ib.status,
          rowsTotal: ib.rowsTotal,
          rowsMatched: ib.rowsMatched,
          rowsCreated: ib.rowsCreated,
          rowsSkipped: ib.rowsSkipped,
        },
      })
    }
  }

  console.log(`\nSeed complete:`)
  console.log(`  Accounts:      ${accounts.length}`)
  console.log(`  Categories:    ${categoryMap.size}`)
  console.log(`  Payees:        ${payeeMap.size}`)
  console.log(`  Tags:          ${tagMap.size}`)
  console.log(`  Transactions:  ${txCount}`)
  console.log(`  Splits:        ${splitCount}`)
  console.log(`  Tag links:     ${tagCount}`)
  console.log(`  Assignments:   ${assignmentCount}`)
  console.log(`  Import batches: ${importBatches.length}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error("Failed to seed database", error)
    await prisma.$disconnect()
    process.exit(1)
  })
