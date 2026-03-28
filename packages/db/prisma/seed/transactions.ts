import type { ClearingStatus, MonthKey } from "./helpers.js"
import {
  clearingStatusForDate,
  generateTransferPairId,
  parseMonthKey,
  random,
  randomChoice,
  randomDate,
  randomInt,
  weightedChoice,
} from "./helpers.js"

export type SplitDescriptor = {
  categoryName: string
  payeeName?: string
  note?: string
  amountMinor: number
}

export type TransactionDescriptor = {
  date: Date
  accountName: string
  payeeName: string | null
  categoryName: string | null
  amountMinor: number
  note: string | null
  clearingStatus: ClearingStatus
  isTransfer: boolean
  transferAccountName: string | null
  transferPairId: string | null
  tagNames: string[]
  splits: SplitDescriptor[] | null
}

function makeDate(year: number, month: number, day: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, daysInMonth))
}

function getMonth(monthKeys: MonthKey[], index: number) {
  const key = monthKeys[index]
  if (!key) throw new Error(`Month index ${index} out of range`)
  return parseMonthKey(key)
}

function hydroAmount(monthIndex: number): number {
  const amounts = [12500, 14500, 16500, 15500, 11000, 10000] as const
  return amounts[monthIndex] ?? 12000
}

function generateRecurring(
  monthKeys: MonthKey[],
  today: Date,
): TransactionDescriptor[] {
  const txs: TransactionDescriptor[] = []

  for (const [monthIndex, key] of monthKeys.entries()) {
    const { year, month } = parseMonthKey(key)

    const base = (
      day: number,
      accountName: string,
      payeeName: string | null,
      categoryName: string | null,
      amountMinor: number,
      opts?: {
        isTransfer?: boolean
        transferAccountName?: string | null
        transferPairId?: string | null
        note?: string | null
      },
    ): TransactionDescriptor => {
      const date = makeDate(year, month, day)
      return {
        date,
        accountName,
        payeeName,
        categoryName,
        amountMinor,
        note: opts?.note ?? null,
        clearingStatus: clearingStatusForDate(date, today),
        isTransfer: opts?.isTransfer ?? false,
        transferAccountName: opts?.transferAccountName ?? null,
        transferPairId: opts?.transferPairId ?? null,
        tagNames: [],
        splits: null,
      }
    }

    // Mortgage transfer pair
    const mortgageId = generateTransferPairId()
    txs.push(base(1, "TD Chequing", "Scotiabank Mortgage", "🏠 Mortgage", -158000, {
      isTransfer: true, transferAccountName: "Scotiabank Mortgage", transferPairId: mortgageId,
    }))
    txs.push(base(1, "Scotiabank Mortgage", null, null, 158000, {
      isTransfer: true, transferAccountName: "TD Chequing", transferPairId: mortgageId,
    }))

    // Property tax
    txs.push(base(1, "TD Chequing", "City of Ottawa", "🏛️ Property Tax", -28500))

    // Car payment transfer pair
    const carId = generateTransferPairId()
    txs.push(base(5, "TD Chequing", "TD Auto Finance", "🚗 Car Payment", -42500, {
      isTransfer: true, transferAccountName: "Honda CR-V Loan (TD)", transferPairId: carId,
    }))
    txs.push(base(5, "Honda CR-V Loan (TD)", null, null, 42500, {
      isTransfer: true, transferAccountName: "TD Chequing", transferPairId: carId,
    }))

    // Auto insurance
    txs.push(base(7, "TD Chequing", "Desjardins Insurance", "📄 Auto Insurance", -14200))

    // Internet
    txs.push(base(10, "TD Chequing", "Bell Canada", "🌐 Internet", -8999))

    // Phone
    txs.push(base(10, "TD Chequing", "Telus", "📱 Phone", -5500))

    // Hydro (seasonal)
    txs.push(base(12, "TD Chequing", "Hydro Ottawa", "⚡ Hydro", -hydroAmount(monthIndex)))

    // Home insurance
    txs.push(base(20, "TD Chequing", "Desjardins Insurance", "🛡️ Home Insurance", -10800))

    // Paycheques
    txs.push(base(15, "TD Chequing", "Employer - Alex", "💰 Ready to Assign", 410000, { note: "Paycheque" }))
    txs.push(base(28, "TD Chequing", "Employer - Jamie", "💰 Ready to Assign", 410000, { note: "Paycheque" }))

    // Subscriptions
    txs.push(base(20, "CIBC Visa", "Netflix", "📺 Subscriptions", -2299))
    txs.push(base(20, "CIBC Visa", "Spotify", "📺 Subscriptions", -1199))
    txs.push(base(20, "CIBC Visa", "Apple", "📺 Subscriptions", -699, { note: "iCloud" }))

    // TFSA contribution transfer pair
    const tfsaId = generateTransferPairId()
    txs.push(base(15, "TD Chequing", "Wealthsimple", "📊 TFSA Contribution", -50000, {
      isTransfer: true, transferAccountName: "Wealthsimple TFSA", transferPairId: tfsaId,
    }))
    txs.push(base(15, "Wealthsimple TFSA", null, null, 50000, {
      isTransfer: true, transferAccountName: "TD Chequing", transferPairId: tfsaId,
    }))

    // RRSP contribution transfer pair
    const rrspId = generateTransferPairId()
    txs.push(base(15, "TD Chequing", "Wealthsimple", "📈 RRSP Contribution", -37500, {
      isTransfer: true, transferAccountName: "Wealthsimple RRSP", transferPairId: rrspId,
    }))
    txs.push(base(15, "Wealthsimple RRSP", null, null, 37500, {
      isTransfer: true, transferAccountName: "TD Chequing", transferPairId: rrspId,
    }))

    // CC payment (transfer) — pay off roughly what was charged on CIBC
    const ccPayId = generateTransferPairId()
    const ccPayAmount = randomInt(95000, 130000)
    txs.push(base(25, "TD Chequing", null, null, -ccPayAmount, {
      isTransfer: true, transferAccountName: "CIBC Visa", transferPairId: ccPayId,
    }))
    txs.push(base(25, "CIBC Visa", null, null, ccPayAmount, {
      isTransfer: true, transferAccountName: "TD Chequing", transferPairId: ccPayId,
    }))
  }

  return txs
}

function generateVariable(
  monthKeys: MonthKey[],
  today: Date,
): TransactionDescriptor[] {
  const txs: TransactionDescriptor[] = []

  const tx = (
    date: Date,
    accountName: string,
    payeeName: string,
    categoryName: string,
    amountMinor: number,
    opts?: { note?: string; tagNames?: string[]; splits?: SplitDescriptor[] },
  ): TransactionDescriptor => ({
    date,
    accountName,
    payeeName,
    categoryName,
    amountMinor,
    note: opts?.note ?? null,
    clearingStatus: clearingStatusForDate(date, today),
    isTransfer: false,
    transferAccountName: null,
    transferPairId: null,
    tagNames: opts?.tagNames ?? [],
    splits: opts?.splits ?? null,
  })

  const groceryPayees = ["Loblaws", "Costco", "Farm Boy", "Metro", "Walmart"] as const
  const groceryWeights = [3, 2, 2, 2, 1]
  const coffeePayees = ["Tim Hortons", "Starbucks", "Second Cup"] as const
  const restaurantPayees = ["Swiss Chalet", "Shawarma Palace", "Restaurant"] as const
  const deliveryPayees = ["SkipTheDishes", "DoorDash"] as const
  const gasPayees = ["Shell", "Petro-Canada"] as const
  const sportPayees = ["Sport Chek", "MEC"] as const
  const shoppingPayees = ["Amazon", "Canadian Tire", "Home Depot", "Winners"] as const
  const entertainmentPayees = ["Cineplex", "Indigo"] as const

  for (const key of monthKeys) {
    const { year, month } = parseMonthKey(key)

    // Groceries: 8-12 per month
    const groceryCount = randomInt(8, 12)
    for (let i = 0; i < groceryCount; i++) {
      const payee = weightedChoice([...groceryPayees], groceryWeights)
      const isCostco = payee === "Costco"
      const amount = isCostco ? randomInt(12000, 22000) : randomInt(2500, 9000)
      const account = random() < 0.7 ? "CIBC Visa" : "TD Chequing"
      const date = randomDate(year, month, 1, 28)
      const tags = random() < 0.15 ? ["MEAL PREP"] : []
      txs.push(tx(date, account, payee, "🛒 Groceries", -amount, { tagNames: tags }))
    }

    // Restaurants: 3-5 per month
    const restaurantCount = randomInt(3, 5)
    for (let i = 0; i < restaurantCount; i++) {
      const payee = randomChoice(restaurantPayees)
      const amount = randomInt(2500, 7500)
      const date = randomDate(year, month, 1, 28)
      const tags = i === 0 ? ["DATE NIGHT"] : []
      txs.push(tx(date, "CIBC Visa", payee, "🍽️ Restaurants", -amount, { tagNames: tags }))
    }

    // Coffee shops: 4-8 per month
    const coffeeCount = randomInt(4, 8)
    for (let i = 0; i < coffeeCount; i++) {
      const payee = randomChoice(coffeePayees)
      const amount = randomInt(400, 1200)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "TD Visa Infinite", payee, "☕ Coffee Shops", -amount))
    }

    // Food delivery: 2-3 per month
    const deliveryCount = randomInt(2, 3)
    for (let i = 0; i < deliveryCount; i++) {
      const payee = randomChoice(deliveryPayees)
      const amount = randomInt(2500, 5500)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "CIBC Visa", payee, "📦 Food Delivery", -amount))
    }

    // Gas: 3-4 per month
    const gasCount = randomInt(3, 4)
    for (let i = 0; i < gasCount; i++) {
      const payee = randomChoice(gasPayees)
      const amount = randomInt(5500, 8500)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "TD Visa Infinite", payee, "⛽ Gas", -amount))
    }

    // Pet expenses: 1-2 per month
    {
      const amount = randomInt(4000, 9000)
      const date = randomDate(year, month, 5, 20)
      txs.push(tx(date, "CIBC Visa", "PetSmart", "🐕 Mango (food & supplies)", -amount, { tagNames: ["PET"] }))
      if (random() < 0.4) {
        const amount2 = randomInt(3000, 6000)
        const date2 = randomDate(year, month, 15, 28)
        txs.push(tx(date2, "CIBC Visa", "PetSmart", "🐕 Mango (food & supplies)", -amount2, { tagNames: ["PET"] }))
      }
    }

    // Sports & fitness: 2-3 per month
    const sportCount = randomInt(2, 3)
    for (let i = 0; i < sportCount; i++) {
      const payee = randomChoice(sportPayees)
      const amount = randomInt(2000, 12000)
      const date = randomDate(year, month, 1, 28)
      const tag = random() < 0.5 ? "HOCKEY" : "RUNNING"
      txs.push(tx(date, "CIBC Visa", payee, "🏋️ Sports & Fitness", -amount, { tagNames: [tag] }))
    }

    // Entertainment: 2-3 per month
    const entertainmentCount = randomInt(2, 3)
    for (let i = 0; i < entertainmentCount; i++) {
      const payee = randomChoice(entertainmentPayees)
      const amount = payee === "Cineplex" ? randomInt(1500, 3500) : randomInt(1500, 4500)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "CIBC Visa", payee, "🎬 Entertainment", -amount))
    }

    // Shopping: 1-3 per month
    const shoppingCount = randomInt(1, 3)
    for (let i = 0; i < shoppingCount; i++) {
      const payee = randomChoice(shoppingPayees)
      const isClothing = payee === "Winners"
      const category = isClothing ? "👕 Clothing" : "🛒 Online Shopping"
      const amount = randomInt(1500, 9000)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "CIBC Visa", payee, category, -amount))
    }

    // ATM + cash: 1-2 withdrawals per month
    const atmCount = randomInt(1, 2)
    for (let i = 0; i < atmCount; i++) {
      const amount = randomInt(10000, 20000)
      const date = randomDate(year, month, 1, 25)
      const pairId = generateTransferPairId()
      txs.push({
        date,
        accountName: "TD Chequing",
        payeeName: "ATM",
        categoryName: null,
        amountMinor: -amount,
        note: null,
        clearingStatus: clearingStatusForDate(date, today),
        isTransfer: true,
        transferAccountName: "Cash Wallet",
        transferPairId: pairId,
        tagNames: [],
        splits: null,
      })
      txs.push({
        date,
        accountName: "Cash Wallet",
        payeeName: null,
        categoryName: null,
        amountMinor: amount,
        note: null,
        clearingStatus: clearingStatusForDate(date, today),
        isTransfer: true,
        transferAccountName: "TD Chequing",
        transferPairId: pairId,
        tagNames: [],
        splits: null,
      })

      // Small cash purchases after withdrawal
      const cashPurchases = randomInt(2, 3)
      for (let j = 0; j < cashPurchases; j++) {
        const cashAmount = randomInt(500, 3000)
        const cashDate = randomDate(year, month, date.getDate(), Math.min(date.getDate() + 7, 28))
        const cashCategory = randomChoice(["☕ Coffee Shops", "🅿️ Parking", "🍽️ Restaurants"])
        txs.push(tx(cashDate, "Cash Wallet", "Other", cashCategory, -cashAmount))
      }
    }

    // Pharmacy: ~1 per month
    if (random() < 0.7) {
      const amount = randomInt(1500, 4500)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "CIBC Visa", "Shoppers Drug Mart", "💊 Pharmacy", -amount))
    }

    // Haircut: every other month
    if (random() < 0.5) {
      const amount = randomInt(3000, 5500)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "TD Chequing", "e-Transfer", "💇 Haircuts & Grooming", -amount))
    }

    // Uber/parking: 1-2 per month
    if (random() < 0.6) {
      const amount = randomInt(800, 2500)
      const date = randomDate(year, month, 1, 28)
      txs.push(tx(date, "CIBC Visa", "Uber", "🅿️ Parking", -amount))
    }
  }

  return txs
}

function generateOneOffs(
  monthKeys: MonthKey[],
  today: Date,
): TransactionDescriptor[] {
  const txs: TransactionDescriptor[] = []

  const tx = (
    date: Date,
    accountName: string,
    payeeName: string | null,
    categoryName: string | null,
    amountMinor: number,
    opts?: {
      note?: string
      tagNames?: string[]
      isTransfer?: boolean
      transferAccountName?: string
      transferPairId?: string
      splits?: SplitDescriptor[]
    },
  ): TransactionDescriptor => ({
    date,
    accountName,
    payeeName,
    categoryName,
    amountMinor,
    note: opts?.note ?? null,
    clearingStatus: clearingStatusForDate(date, today),
    isTransfer: opts?.isTransfer ?? false,
    transferAccountName: opts?.transferAccountName ?? null,
    transferPairId: opts?.transferPairId ?? null,
    tagNames: opts?.tagNames ?? [],
    splits: opts?.splits ?? null,
  })

  // Month 0 (6 months ago): snow tires + hockey registration
  {
    const { year, month } = getMonth(monthKeys, 0)
    txs.push(tx(
      new Date(year, month, 18), "CIBC Visa", "Canadian Tire",
      "🔧 Car Maintenance", -18500, { note: "Snow tires install" },
    ))
    txs.push(tx(
      new Date(year, month, 8), "CIBC Visa", "Sport Chek",
      "🏋️ Sports & Fitness", -35000, { note: "Hockey league registration", tagNames: ["HOCKEY"] },
    ))
    txs.push(tx(
      new Date(year, month, 22), "CIBC Visa", "MEC",
      "🏋️ Sports & Fitness", -8900, { note: "Camping headlamp + supplies", tagNames: ["CAMPING"] },
    ))
  }

  // Month 1: Black Friday
  {
    const { year, month } = getMonth(monthKeys, 1)
    txs.push(tx(new Date(year, month, 27), "CIBC Visa", "Amazon", "🛒 Online Shopping", -34000, { note: "Black Friday deals" }))
    txs.push(tx(new Date(year, month, 28), "CIBC Visa", "IKEA", "🪑 Furniture & Decor", -34000, { note: "Bookshelf" }))
    txs.push(tx(new Date(year, month, 27), "CIBC Visa", "Sport Chek", "🏋️ Sports & Fitness", -9500))
    txs.push(tx(new Date(year, month, 26), "CIBC Visa", "MEC", "👕 Clothing", -28000, { note: "Winter jacket" }))
    txs.push(tx(new Date(year, month, 10), "CIBC Visa", "Nintendo", "🎬 Entertainment", -8000, { note: "Game" }))
  }

  // Month 2: Holiday gifts + vet
  {
    const { year, month } = getMonth(monthKeys, 2)
    txs.push(tx(new Date(year, month, 12), "CIBC Visa", "Amazon", "🎁 Gifts", -8500, { note: "Gift for Mom", tagNames: ["GIFTS"] }))
    txs.push(tx(new Date(year, month, 15), "CIBC Visa", "Indigo", "🎁 Gifts", -4200, { note: "Book for Dad", tagNames: ["GIFTS"] }))
    txs.push(tx(new Date(year, month, 18), "CIBC Visa", "Winners", "🎁 Gifts", -6500, { note: "Scarf for Jamie", tagNames: ["GIFTS"] }))
    txs.push(tx(new Date(year, month, 20), "CIBC Visa", "Amazon", "🎁 Gifts", -12000, { note: "Gifts for nephews", tagNames: ["GIFTS"] }))
    txs.push(tx(new Date(year, month, 8), "CIBC Visa", "Alta Vista Animal Hospital", "🏥 Vet", -28000, { note: "Annual checkup", tagNames: ["PET"] }))
  }

  // Month 3: New Year + running + emergency fund top-up
  {
    const { year, month } = getMonth(monthKeys, 3)
    txs.push(tx(new Date(year, month, 1), "CIBC Visa", "Restaurant", "🍽️ Restaurants", -9500, { note: "New Year dinner", tagNames: ["DATE NIGHT"] }))
    txs.push(tx(new Date(year, month, 10), "CIBC Visa", "MEC", "🏋️ Sports & Fitness", -16000, { note: "Running shoes", tagNames: ["RUNNING"] }))

    const savingsId = generateTransferPairId()
    txs.push(tx(new Date(year, month, 20), "TD Chequing", "e-Transfer", "🚨 Emergency Fund", -100000, {
      isTransfer: true, transferAccountName: "Scotiabank Savings", transferPairId: savingsId,
    }))
    txs.push(tx(new Date(year, month, 20), "Scotiabank Savings", null, null, 100000, {
      isTransfer: true, transferAccountName: "TD Chequing", transferPairId: savingsId,
    }))

    txs.push(tx(new Date(year, month, 15), "CIBC Visa", "Amazon", "🖥️ Electronics", -5500, { note: "USB-C hub", tagNames: ["WORK EXPENSE"] }))
  }

  // Month 4: Cottage weekend + Valentine's
  {
    const { year, month } = getMonth(monthKeys, 4)
    txs.push(tx(new Date(year, month, 7), "CIBC Visa", "AirBnb", "✈️ Vacation Fund", -32000, { note: "Cottage rental", tagNames: ["COTTAGE WEEKEND"] }))
    txs.push(tx(new Date(year, month, 8), "CIBC Visa", "Loblaws", "🛒 Groceries", -8500, { note: "Cottage groceries", tagNames: ["COTTAGE WEEKEND"] }))
    txs.push(tx(new Date(year, month, 8), "TD Visa Infinite", "Shell", "⛽ Gas", -7800, { note: "Drive to Muskoka", tagNames: ["COTTAGE WEEKEND"] }))
    txs.push(tx(new Date(year, month, 8), "CIBC Visa", "Restaurant", "🍽️ Restaurants", -5200, { note: "Cottage dinner out", tagNames: ["COTTAGE WEEKEND"] }))
    txs.push(tx(new Date(year, month, 7), "CIBC Visa", "LCBO", "🛒 Groceries", -4500, { note: "Wine for cottage", tagNames: ["COTTAGE WEEKEND"] }))
    txs.push(tx(new Date(year, month, 14), "CIBC Visa", "Restaurant", "🍽️ Restaurants", -8500, { note: "Valentine's dinner", tagNames: ["DATE NIGHT"] }))
    txs.push(tx(new Date(year, month, 14), "CIBC Visa", "Winners", "🎁 Gifts", -4500, { note: "Valentine's gift", tagNames: ["GIFTS"] }))
    txs.push(tx(new Date(year, month, 5), "CIBC Visa", "Alta Vista Animal Hospital", "🏥 Vet", -16500, { note: "Mango ear infection", tagNames: ["PET"] }))
  }

  // Month 5 (current): Backyard patio + car maintenance + RRSP top-up
  {
    const { year, month } = getMonth(monthKeys, 5)
    const currentDay = today.getDate()
    const safeDay = (d: number) => Math.min(d, currentDay)

    txs.push(tx(makeDate(year, month, safeDay(5)), "CIBC Visa", "Home Depot", "🏡 Backyard Patio 2026", -65000, { note: "Lumber and hardware", tagNames: ["HOME PROJECT"] }))
    txs.push(tx(makeDate(year, month, safeDay(12)), "CIBC Visa", "Home Depot", "🏡 Backyard Patio 2026", -42000, { note: "Deck boards", tagNames: ["HOME PROJECT"] }))
    txs.push(tx(makeDate(year, month, safeDay(8)), "CIBC Visa", "Canadian Tire", "🔧 Car Maintenance", -21000, { note: "Spring oil change + inspection" }))

    const rrspTopUpId = generateTransferPairId()
    txs.push(tx(makeDate(year, month, safeDay(1)), "TD Chequing", "Wealthsimple", "📈 RRSP Contribution", -200000, {
      note: "RRSP deadline top-up",
      isTransfer: true, transferAccountName: "Wealthsimple RRSP", transferPairId: rrspTopUpId,
    }))
    txs.push(tx(makeDate(year, month, safeDay(1)), "Wealthsimple RRSP", null, null, 200000, {
      isTransfer: true, transferAccountName: "TD Chequing", transferPairId: rrspTopUpId,
    }))

    txs.push(tx(makeDate(year, month, safeDay(3)), "CIBC Visa", "MEC", "🏋️ Sports & Fitness", -4500, { note: "Race entry fee", tagNames: ["RUNNING"] }))
  }

  return txs
}

function generateSplitTransactions(
  monthKeys: MonthKey[],
  today: Date,
): TransactionDescriptor[] {
  const txs: TransactionDescriptor[] = []

  const { year: y0, month: m0 } = getMonth(monthKeys, 0)
  const { year: y1, month: m1 } = getMonth(monthKeys, 1)
  const { year: y2, month: m2 } = getMonth(monthKeys, 2)
  const { year: y4, month: m4 } = getMonth(monthKeys, 4)
  const { year: y5, month: m5 } = getMonth(monthKeys, 5)

  const currentDay = today.getDate()

  // Costco split: Groceries + Pharmacy + Gifts
  txs.push({
    date: new Date(y0, m0, 15),
    accountName: "CIBC Visa",
    payeeName: "Costco",
    categoryName: "🛒 Groceries",
    amountMinor: -20500,
    note: null,
    clearingStatus: clearingStatusForDate(new Date(y0, m0, 15), today),
    isTransfer: false,
    transferAccountName: null,
    transferPairId: null,
    tagNames: [],
    splits: [
      { categoryName: "🛒 Groceries", amountMinor: -14500 },
      { categoryName: "💊 Pharmacy", amountMinor: -3200 },
      { categoryName: "🎁 Gifts", amountMinor: -2800, note: "Birthday candles + card" },
    ],
  })

  // Walmart split: Groceries + Clothing
  txs.push({
    date: new Date(y1, m1, 10),
    accountName: "CIBC Visa",
    payeeName: "Walmart",
    categoryName: "🛒 Groceries",
    amountMinor: -11200,
    note: null,
    clearingStatus: clearingStatusForDate(new Date(y1, m1, 10), today),
    isTransfer: false,
    transferAccountName: null,
    transferPairId: null,
    tagNames: [],
    splits: [
      { categoryName: "🛒 Groceries", amountMinor: -6700 },
      { categoryName: "👕 Clothing", amountMinor: -4500 },
    ],
  })

  // Amazon split: Electronics + Gifts
  txs.push({
    date: new Date(y2, m2, 5),
    accountName: "CIBC Visa",
    payeeName: "Amazon",
    categoryName: "🖥️ Electronics",
    amountMinor: -12400,
    note: null,
    clearingStatus: clearingStatusForDate(new Date(y2, m2, 5), today),
    isTransfer: false,
    transferAccountName: null,
    transferPairId: null,
    tagNames: ["GIFTS"],
    splits: [
      { categoryName: "🖥️ Electronics", amountMinor: -8900 },
      { categoryName: "🎁 Gifts", amountMinor: -3500, note: "Stocking stuffer" },
    ],
  })

  // Restaurant split: Restaurants + Gifts (paid for friend)
  txs.push({
    date: new Date(y4, m4, 20),
    accountName: "CIBC Visa",
    payeeName: "Swiss Chalet",
    categoryName: "🍽️ Restaurants",
    amountMinor: -8400,
    note: "Friend's birthday dinner",
    clearingStatus: clearingStatusForDate(new Date(y4, m4, 20), today),
    isTransfer: false,
    transferAccountName: null,
    transferPairId: null,
    tagNames: ["GIFTS"],
    splits: [
      { categoryName: "🍽️ Restaurants", amountMinor: -4200 },
      { categoryName: "🎁 Gifts", amountMinor: -4200, note: "Paid for friend" },
    ],
  })

  // Home Depot split: Home Maintenance + Backyard Patio
  txs.push({
    date: makeDate(y5, m5, Math.min(18, currentDay)),
    accountName: "CIBC Visa",
    payeeName: "Home Depot",
    categoryName: "🔨 Home Maintenance",
    amountMinor: -20500,
    note: "Mixed purchase",
    clearingStatus: clearingStatusForDate(makeDate(y5, m5, Math.min(18, currentDay)), today),
    isTransfer: false,
    transferAccountName: null,
    transferPairId: null,
    tagNames: ["HOME PROJECT"],
    splits: [
      { categoryName: "🔨 Home Maintenance", amountMinor: -12000 },
      { categoryName: "🏡 Backyard Patio 2026", amountMinor: -8500, note: "Stain + sealant" },
    ],
  })

  return txs
}

export function generateAllTransactions(
  monthKeys: MonthKey[],
  today: Date,
): TransactionDescriptor[] {
  const recurring = generateRecurring(monthKeys, today)
  const variable = generateVariable(monthKeys, today)
  const oneOffs = generateOneOffs(monthKeys, today)
  const splits = generateSplitTransactions(monthKeys, today)
  return [...recurring, ...variable, ...oneOffs, ...splits]
}
