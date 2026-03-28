export type CategorySeed = {
  name: string
  isIncomeCategory?: boolean
}

export type CategoryGroupSeed = {
  name: string
  categories: CategorySeed[]
}

export const categoryGroups: CategoryGroupSeed[] = [
  {
    name: "Income",
    categories: [{ name: "💰 Ready to Assign", isIncomeCategory: true }],
  },
  {
    name: "🏠 Housing",
    categories: [
      { name: "🏠 Mortgage" },
      { name: "🏛️ Property Tax" },
      { name: "🛡️ Home Insurance" },
      { name: "🔨 Home Maintenance" },
      { name: "🪑 Furniture & Decor" },
    ],
  },
  {
    name: "💡 Utilities",
    categories: [
      { name: "⚡ Hydro" },
      { name: "🌐 Internet" },
      { name: "📱 Phone" },
    ],
  },
  {
    name: "🍔 Food & Drink",
    categories: [
      { name: "🛒 Groceries" },
      { name: "🍽️ Restaurants" },
      { name: "☕ Coffee Shops" },
      { name: "📦 Food Delivery" },
    ],
  },
  {
    name: "🚗 Transportation",
    categories: [
      { name: "🚗 Car Payment" },
      { name: "📄 Auto Insurance" },
      { name: "⛽ Gas" },
      { name: "🅿️ Parking" },
      { name: "🔧 Car Maintenance" },
    ],
  },
  {
    name: "🐾 Pets",
    categories: [
      { name: "🐕 Mango (food & supplies)" },
      { name: "🏥 Vet" },
    ],
  },
  {
    name: "🧴 Personal",
    categories: [
      { name: "👕 Clothing" },
      { name: "💇 Haircuts & Grooming" },
      { name: "⚕️ Healthcare" },
      { name: "💊 Pharmacy" },
    ],
  },
  {
    name: "🎉 Fun & Lifestyle",
    categories: [
      { name: "🏋️ Sports & Fitness" },
      { name: "🎬 Entertainment" },
      { name: "🎨 Hobbies" },
      { name: "📺 Subscriptions" },
    ],
  },
  {
    name: "🛍️ Shopping",
    categories: [
      { name: "🖥️ Electronics" },
      { name: "🎁 Gifts" },
      { name: "🛒 Online Shopping" },
    ],
  },
  {
    name: "💰 Savings Goals",
    categories: [
      { name: "🚨 Emergency Fund" },
      { name: "✈️ Vacation Fund" },
      { name: "📈 RRSP Contribution" },
      { name: "📊 TFSA Contribution" },
    ],
  },
  {
    name: "🪜 Projects",
    categories: [
      { name: "🏡 Backyard Patio 2026" },
      { name: "🇮🇸 Iceland Trip 2026" },
    ],
  },
]
