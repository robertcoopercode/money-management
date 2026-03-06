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
    categories: [
      { name: "Mortgage" },
      { name: "Hydro" },
      { name: "Internet" },
      { name: "Phone" },
    ],
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

const main = async () => {
  for (const [groupIndex, group] of groups.entries()) {
    const upsertedGroup = await prisma.categoryGroup.upsert({
      where: { name: group.name },
      update: { sortOrder: groupIndex },
      create: { name: group.name, sortOrder: groupIndex },
    })

    for (const [categoryIndex, category] of group.categories.entries()) {
      await prisma.category.upsert({
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
