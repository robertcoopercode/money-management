import "../src/env.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

type CategorySeed = {
  name: string
  isIncomeCategory?: boolean
}

type CategoryGroupSeed = {
  name: string
  categories: CategorySeed[]
}

const groups: CategoryGroupSeed[] = [
  {
    name: "Income",
    categories: [{ name: "Ready to Assign", isIncomeCategory: true }],
  },
  {
    name: "Fixed / Annual",
    categories: [{ name: "Hydro" }, { name: "Internet" }, { name: "Phone" }],
  },
  {
    name: "Home",
    categories: [{ name: "Furniture & Home Goods" }, { name: "Yard & Garden" }],
  },
  {
    name: "Vehicle",
    categories: [
      { name: "Car" },
      { name: "Fuel + Parking" },
      { name: "Repairs + Maintenance" },
    ],
  },
  {
    name: "Food",
    categories: [{ name: "Groceries & Household" }, { name: "Eating Out" }],
  },
]

const accounts = [
  {
    name: "TD Chequing",
    type: "CASH" as const,
    startingBalanceMinor: 450000,
  },
  {
    name: "Visa Infinite",
    type: "CREDIT" as const,
    startingBalanceMinor: -128500,
  },
]

const payees = [
  "Loblaws",
  "Costco",
  "Amazon",
  "Netflix",
  "Hydro One",
  "Bell Canada",
  "Shell",
  "Tim Hortons",
  "IKEA",
  "Canadian Tire",
]

type TransactionSeed = {
  accountName: string
  payeeName: string
  categoryPath: [string, string]
  amountMinor: number
  daysAgo: number
  cleared?: boolean
  note?: string
}

const transactions: TransactionSeed[] = [
  // Chequing transactions
  {
    accountName: "TD Chequing",
    payeeName: "Loblaws",
    categoryPath: ["Food", "Groceries & Household"],
    amountMinor: -14523,
    daysAgo: 2,
    cleared: true,
  },
  {
    accountName: "TD Chequing",
    payeeName: "Shell",
    categoryPath: ["Vehicle", "Fuel + Parking"],
    amountMinor: -7845,
    daysAgo: 4,
    cleared: true,
  },
  {
    accountName: "TD Chequing",
    payeeName: "Hydro One",
    categoryPath: ["Fixed / Annual", "Hydro"],
    amountMinor: -18900,
    daysAgo: 7,
    cleared: true,
  },
  {
    accountName: "TD Chequing",
    payeeName: "Bell Canada",
    categoryPath: ["Fixed / Annual", "Internet"],
    amountMinor: -11499,
    daysAgo: 7,
    cleared: true,
  },
  {
    accountName: "TD Chequing",
    payeeName: "Canadian Tire",
    categoryPath: ["Home", "Yard & Garden"],
    amountMinor: -4599,
    daysAgo: 10,
    cleared: true,
  },
  {
    accountName: "TD Chequing",
    payeeName: "Costco",
    categoryPath: ["Food", "Groceries & Household"],
    amountMinor: -23150,
    daysAgo: 14,
    cleared: true,
  },
  {
    accountName: "TD Chequing",
    payeeName: "Tim Hortons",
    categoryPath: ["Food", "Eating Out"],
    amountMinor: -1285,
    daysAgo: 1,
    cleared: false,
  },
  // Credit card transactions
  {
    accountName: "Visa Infinite",
    payeeName: "Amazon",
    categoryPath: ["Home", "Furniture & Home Goods"],
    amountMinor: -8999,
    daysAgo: 3,
    cleared: true,
    note: "Desk lamp",
  },
  {
    accountName: "Visa Infinite",
    payeeName: "Netflix",
    categoryPath: ["Fixed / Annual", "Phone"],
    amountMinor: -2099,
    daysAgo: 5,
    cleared: true,
  },
  {
    accountName: "Visa Infinite",
    payeeName: "IKEA",
    categoryPath: ["Home", "Furniture & Home Goods"],
    amountMinor: -34900,
    daysAgo: 8,
    cleared: true,
    note: "Bookshelf",
  },
  {
    accountName: "Visa Infinite",
    payeeName: "Costco",
    categoryPath: ["Food", "Groceries & Household"],
    amountMinor: -18720,
    daysAgo: 11,
    cleared: true,
  },
  {
    accountName: "Visa Infinite",
    payeeName: "Loblaws",
    categoryPath: ["Food", "Groceries & Household"],
    amountMinor: -9845,
    daysAgo: 15,
    cleared: true,
  },
  {
    accountName: "Visa Infinite",
    payeeName: "Shell",
    categoryPath: ["Vehicle", "Fuel + Parking"],
    amountMinor: -6530,
    daysAgo: 18,
    cleared: true,
  },
  {
    accountName: "Visa Infinite",
    payeeName: "Tim Hortons",
    categoryPath: ["Food", "Eating Out"],
    amountMinor: -875,
    daysAgo: 0,
    cleared: false,
  },
  // Income
  {
    accountName: "TD Chequing",
    payeeName: "Loblaws",
    categoryPath: ["Income", "Ready to Assign"],
    amountMinor: 325000,
    daysAgo: 15,
    cleared: true,
    note: "Paycheque",
  },
  {
    accountName: "TD Chequing",
    payeeName: "Loblaws",
    categoryPath: ["Income", "Ready to Assign"],
    amountMinor: 325000,
    daysAgo: 30,
    cleared: true,
    note: "Paycheque",
  },
]

const main = async () => {
  // Seed category groups and categories
  const categoryMap = new Map<string, string>() // "Group|Category" -> categoryId

  for (const [groupIndex, group] of groups.entries()) {
    const upsertedGroup = await prisma.categoryGroup.upsert({
      where: { name: group.name },
      update: { sortOrder: groupIndex },
      create: { name: group.name, sortOrder: groupIndex },
    })

    for (const [categoryIndex, category] of group.categories.entries()) {
      const upsertedCategory = await prisma.category.upsert({
        where: {
          groupId_name: {
            groupId: upsertedGroup.id,
            name: category.name,
          },
        },
        update: {
          isIncomeCategory: category.isIncomeCategory ?? false,
          sortOrder: categoryIndex,
        },
        create: {
          name: category.name,
          groupId: upsertedGroup.id,
          isIncomeCategory: category.isIncomeCategory ?? false,
          sortOrder: categoryIndex,
        },
      })
      categoryMap.set(`${group.name}|${category.name}`, upsertedCategory.id)
    }
  }

  // Seed accounts
  const accountMap = new Map<string, string>()
  for (const account of accounts) {
    const existing = await prisma.account.findFirst({
      where: { name: account.name },
    })
    if (existing) {
      accountMap.set(account.name, existing.id)
    } else {
      const created = await prisma.account.create({ data: account })
      accountMap.set(account.name, created.id)
    }
  }

  // Seed payees
  const payeeMap = new Map<string, string>()
  for (const name of payees) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "")
    const existing = await prisma.payee.findFirst({ where: { normalizedName } })
    if (existing) {
      payeeMap.set(name, existing.id)
    } else {
      const created = await prisma.payee.create({
        data: { name, normalizedName },
      })
      payeeMap.set(name, created.id)
    }
  }

  // Seed transactions
  const existingTxCount = await prisma.transaction.count()
  if (existingTxCount === 0) {
    const now = new Date()
    for (const tx of transactions) {
      const date = new Date(now)
      date.setDate(date.getDate() - tx.daysAgo)

      const categoryKey = `${tx.categoryPath[0]}|${tx.categoryPath[1]}`

      await prisma.transaction.create({
        data: {
          accountId: accountMap.get(tx.accountName)!,
          payeeId: payeeMap.get(tx.payeeName)!,
          categoryId: categoryMap.get(categoryKey)!,
          amountMinor: tx.amountMinor,
          date,
          cleared: tx.cleared ?? false,
          note: tx.note ?? null,
          origins: {
            create: { originType: "MANUAL" },
          },
        },
      })
    }
  }
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
