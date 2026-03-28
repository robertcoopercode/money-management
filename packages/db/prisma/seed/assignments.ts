import type { MonthKey } from "./helpers.js"

type AssignmentDescriptor = {
  month: MonthKey
  categoryName: string
  assignedMinor: number
}

const baseBudget: Record<string, number> = {
  "🏠 Mortgage": 158000,
  "🏛️ Property Tax": 28500,
  "🛡️ Home Insurance": 10800,
  "🔨 Home Maintenance": 10000,
  "🪑 Furniture & Decor": 5000,
  "⚡ Hydro": 12000,
  "🌐 Internet": 9000,
  "📱 Phone": 5500,
  "🛒 Groceries": 65000,
  "🍽️ Restaurants": 15000,
  "☕ Coffee Shops": 5000,
  "📦 Food Delivery": 8000,
  "🚗 Car Payment": 42500,
  "📄 Auto Insurance": 14200,
  "⛽ Gas": 22000,
  "🅿️ Parking": 3000,
  "🔧 Car Maintenance": 5000,
  "🐕 Mango (food & supplies)": 8000,
  "🏥 Vet": 0,
  "👕 Clothing": 6000,
  "💇 Haircuts & Grooming": 4000,
  "⚕️ Healthcare": 3000,
  "💊 Pharmacy": 2500,
  "🏋️ Sports & Fitness": 8000,
  "🎬 Entertainment": 6000,
  "🎨 Hobbies": 3000,
  "📺 Subscriptions": 4500,
  "🖥️ Electronics": 0,
  "🎁 Gifts": 5000,
  "🛒 Online Shopping": 5000,
  "🚨 Emergency Fund": 20000,
  "✈️ Vacation Fund": 15000,
  "📈 RRSP Contribution": 37500,
  "📊 TFSA Contribution": 50000,
  "🏡 Backyard Patio 2026": 0,
  "🇮🇸 Iceland Trip 2026": 0,
}

type MonthOverrides = Record<string, number>

const overridesByMonthIndex: Record<number, MonthOverrides> = {
  0: {
    "⚡ Hydro": 12500,
  },
  1: {
    "⚡ Hydro": 14500,
    "🪑 Furniture & Decor": 40000,
    "🖥️ Electronics": 10000,
    "🛒 Online Shopping": 35000,
  },
  2: {
    "⚡ Hydro": 16500,
    "🎁 Gifts": 40000,
    "🏥 Vet": 30000,
  },
  3: {
    "⚡ Hydro": 15500,
    "🚨 Emergency Fund": 120000,
    "🇮🇸 Iceland Trip 2026": 20000,
  },
  4: {
    "⚡ Hydro": 11000,
    "🏥 Vet": 18000,
    "✈️ Vacation Fund": 50000,
    "🇮🇸 Iceland Trip 2026": 20000,
  },
  5: {
    "⚡ Hydro": 10000,
    "🔨 Home Maintenance": 20000,
    "🔧 Car Maintenance": 25000,
    "📈 RRSP Contribution": 237500,
    "🏡 Backyard Patio 2026": 120000,
    "🇮🇸 Iceland Trip 2026": 20000,
  },
}

export function generateAssignments(monthKeys: MonthKey[]): AssignmentDescriptor[] {
  const assignments: AssignmentDescriptor[] = []

  for (const [monthIndex, month] of monthKeys.entries()) {
    const overrides = overridesByMonthIndex[monthIndex] ?? {}

    for (const [categoryName, baseAmount] of Object.entries(baseBudget)) {
      const amount = overrides[categoryName] ?? baseAmount
      if (amount > 0) {
        assignments.push({ month, categoryName, assignedMinor: amount })
      }
    }
  }

  return assignments
}
