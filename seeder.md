# Demo Seed Data Plan

Replace the existing lightweight seed (`packages/db/prisma/seed.ts`) with a rich, 6-month demo seeder that produces realistic Canadian household budget data — suitable for public demos without exposing your real financial life.

---

## Persona

**Alex & Jamie Chen** — a dual-income couple in their early 30s living in suburban Ottawa, ON. They own a townhouse, have one car (2023 Honda CR-V), a golden retriever named "Mango", and enjoy outdoor sports. Alex works in tech, Jamie is a teacher. Combined take-home ~$8,200/month.

---

## Time Range

**6 full months ending the day the seed is run.** If seeded on March 25 2026, data spans Oct 2025 → Mar 2026. All dates are computed relative to `new Date()` at runtime.

The seeder is deterministic for a given run date — uses a seeded PRNG (seed value: `"ledgr-demo"`) so randomized amounts/dates are reproducible when re-run on the same day.

---

## 1. Accounts

| Name | Type | Starting Balance | Loan Profile |
|---|---|---|---|
| **TD Chequing** | CASH | $5,200.00 | — |
| **Scotiabank Savings** | CASH | $12,400.00 | — |
| **CIBC Visa** | CREDIT | -$1,340.00 | — |
| **TD Visa Infinite** | CREDIT | -$620.00 | — |
| **Cash Wallet** | CASH | $180.00 | — |
| **Wealthsimple TFSA** | INVESTMENT | $34,500.00 | — |
| **Wealthsimple RRSP** | INVESTMENT | $18,200.00 | — |
| **Honda CR-V Loan (TD)** | LOAN | -$18,450.00 | AUTO, 5.49%, min $425 |
| **Scotiabank Mortgage** | LOAN | -$312,000.00 | MORTGAGE, 4.19%, min $1,580 |

Starting balances represent the state as of the first day of the 6-month window. `startingBalanceAt` is set to the computed start date.

---

## 2. Category Groups & Categories

| Group | Categories |
|---|---|
| **Income** | 💰 Ready to Assign *(isIncomeCategory: true)* |
| **🏠 Housing** | 🏠 Mortgage, 🏛️ Property Tax, 🛡️ Home Insurance, 🔨 Home Maintenance, 🪑 Furniture & Decor |
| **💡 Utilities** | ⚡ Hydro, 🌐 Internet, 📱 Phone |
| **🍔 Food & Drink** | 🛒 Groceries, 🍽️ Restaurants, ☕ Coffee Shops, 📦 Food Delivery |
| **🚗 Transportation** | 🚗 Car Payment, 📄 Auto Insurance, ⛽ Gas, 🅿️ Parking, 🔧 Car Maintenance |
| **🐾 Pets** | 🐕 Mango (food & supplies), 🏥 Vet |
| **🧴 Personal** | 👕 Clothing, 💇 Haircuts & Grooming, ⚕️ Healthcare, 💊 Pharmacy |
| **🎉 Fun & Lifestyle** | 🏋️ Sports & Fitness, 🎬 Entertainment, 🎨 Hobbies, 📺 Subscriptions |
| **🛍️ Shopping** | 🖥️ Electronics, 🎁 Gifts, 🛒 Online Shopping |
| **💰 Savings Goals** | 🚨 Emergency Fund, ✈️ Vacation Fund, 📈 RRSP Contribution, 📊 TFSA Contribution |
| **🪜 Projects** | 🏡 Backyard Patio 2026, 🇮🇸 Iceland Trip 2026 |

~35 categories across 11 groups.

---

## 3. Payees (~40)

All Canadian-flavoured. Each has a `defaultCategoryId` mapping.

| Payee | Default Category |
|---|---|
| Loblaws | Groceries |
| Costco | Groceries |
| Farm Boy | Groceries |
| Metro | Groceries |
| Shoppers Drug Mart | Pharmacy |
| Tim Hortons | Coffee Shops |
| Starbucks | Coffee Shops |
| Second Cup | Coffee Shops |
| Swiss Chalet | Restaurants |
| Shawarma Palace | Restaurants |
| SkipTheDishes | Food Delivery |
| DoorDash | Food Delivery |
| Shell | Gas |
| Petro-Canada | Gas |
| Canadian Tire | Home Maintenance |
| Home Depot | Home Maintenance |
| IKEA | Furniture & Decor |
| Amazon | Online Shopping |
| Walmart | Groceries |
| Winners | Clothing |
| Sport Chek | Sports & Fitness |
| MEC | Sports & Fitness |
| Cineplex | Entertainment |
| Netflix | Subscriptions |
| Spotify | Subscriptions |
| Apple | Subscriptions |
| Nintendo | Entertainment |
| Hydro Ottawa | Hydro |
| Bell Canada | Internet |
| Telus | Phone |
| Scotiabank Mortgage | Mortgage |
| TD Auto Finance | Car Payment |
| Desjardins Insurance | Auto Insurance |
| Wealthsimple | TFSA Contribution |
| City of Ottawa | Property Tax |
| PetSmart | Mango (food & supplies) |
| Alta Vista Animal Hospital | Vet |
| Uber | Parking |
| Indigo | Hobbies |
| LCBO | Groceries |
| AirBnb | Vacation Fund |
| e-Transfer | *(no default)* |
| ATM | *(no default)* |
| Other | *(no default)* |

---

## 4. Tags

| Name | Background | Text | Description |
|---|---|---|---|
| HOCKEY | `#DC2626` | `#FFFFFF` | Hockey league expenses |
| RUNNING | `#059669` | `#FFFFFF` | Running gear & race fees |
| DATE NIGHT | `#F472B6` | `#831843` | Date night outings |
| WORK EXPENSE | `#F59E0B` | `#78350F` | Reimbursable work purchases |
| COTTAGE WEEKEND | `#A5B4FC` | `#312E81` | Muskoka cottage trip expenses |
| CAMPING | `#065F46` | `#ECFDF5` | Camping & outdoor trip gear |
| MEAL PREP | `#7C3AED` | `#FFFFFF` | Bulk grocery hauls for meal prep |
| GIFTS | `#EC4899` | `#FFFFFF` | Gift-related purchases |
| HOME PROJECT | `#D97706` | `#FFFFFF` | Patio and home improvement purchases |
| PET | `#06B6D4` | `#FFFFFF` | All Mango-related expenses |

---

## 5. Transactions

Target: **~400 total transactions** across the 6-month window.

### 5a. Recurring / Predictable (generated per month × 6)

These occur on fixed dates every month:

| ~Day | Payee | Account | Category | Amount | Notes |
|---|---|---|---|---|---|
| 1st | Scotiabank Mortgage | TD Chequing | Mortgage | -$1,580 | Transfer pair → Scotiabank Mortgage (loan) |
| 1st | City of Ottawa | TD Chequing | Property Tax | -$285 | |
| 5th | TD Auto Finance | TD Chequing | Car Payment | -$425 | Transfer pair → Honda CR-V Loan |
| 7th | Desjardins Insurance | TD Chequing | Auto Insurance | -$142 | |
| 10th | Bell Canada | TD Chequing | Internet | -$89.99 | |
| 10th | Telus | TD Chequing | Phone | -$55 | |
| 12th | Hydro Ottawa | TD Chequing | Hydro | varies $85–$165 | Higher in winter |
| 15th | *(employer)* | TD Chequing | Ready to Assign | +$4,100 | Alex paycheque |
| 15th | Wealthsimple | TD Chequing | TFSA Contribution | -$500 | Transfer pair → WS TFSA |
| 15th | Wealthsimple | TD Chequing | RRSP Contribution | -$375 | Transfer pair → WS RRSP |
| 20th | Netflix | CIBC Visa | Subscriptions | -$22.99 | |
| 20th | Spotify | CIBC Visa | Subscriptions | -$11.99 | |
| 20th | Apple | CIBC Visa | Subscriptions | -$6.99 | iCloud |
| 28th | *(employer)* | TD Chequing | Ready to Assign | +$4,100 | Jamie paycheque |
| 25th | *(CC payment)* | TD Chequing → CIBC Visa | *(transfer)* | varies | Pay off CIBC balance |
| ~20th | Desjardins Insurance | TD Chequing | Home Insurance | -$108 | |

### 5b. Variable Spending (generated with seeded PRNG)

Per month, generate a realistic spread of discretionary transactions. Use weighted random selection for payees and amounts drawn from realistic ranges:

**Groceries** (~8–12 tx/month):
- Loblaws, Costco, Farm Boy, Metro, Walmart
- Amounts: $25–$220 (Costco skews $120–$220, others $25–$90)
- Account: mix of CIBC Visa (70%) and TD Chequing (30%)

**Restaurants** (~3–5 tx/month):
- Swiss Chalet, Shawarma Palace, generic "Restaurant"
- Amounts: $25–$75
- Account: CIBC Visa
- ~1/month tagged DATE NIGHT

**Coffee Shops** (~4–8 tx/month):
- Tim Hortons, Starbucks, Second Cup
- Amounts: $4–$12
- Account: TD Visa Infinite

**Food Delivery** (~2–3 tx/month):
- SkipTheDishes, DoorDash
- Amounts: $25–$55
- Account: CIBC Visa

**Gas** (~3–4 tx/month):
- Shell, Petro-Canada
- Amounts: $55–$85
- Account: TD Visa Infinite

**Pet expenses** (~1–2 tx/month):
- PetSmart: $40–$90
- Alta Vista Animal Hospital: 1 visit in Dec ($280), 1 in Feb ($165)

**Sports & Fitness** (~2–3 tx/month):
- Sport Chek, MEC
- Amounts: $20–$120
- ~2/month tagged HOCKEY or RUNNING

**Entertainment** (~2–3 tx/month):
- Cineplex: $15–$35
- Nintendo: 1 purchase in Nov ($80)
- Indigo: $15–$45

**Shopping** (~1–3 tx/month):
- Amazon: $15–$120
- Canadian Tire, Home Depot: $20–$90
- Winners: $25–$65
- IKEA: 1 purchase in Nov ($340, note: "Bookshelf")

**Cash Wallet** (~2–3 tx/month):
- ATM withdrawal from TD Chequing → Cash Wallet (transfer): $100–$200
- Small cash purchases: $5–$30

### 5c. One-Off / Seasonal Events

| Month | Transaction(s) |
|---|---|
| **Oct 2025** | Canadian Tire $185 (snow tires install, tag: n/a), Hockey registration $350 (Sport Chek, tag: HOCKEY) |
| **Nov 2025** | Black Friday — Amazon $340, IKEA $340, Sport Chek $95. MEC winter jacket $280. |
| **Dec 2025** | Gifts — 4–5 gift purchases totalling ~$400 (Amazon, Indigo, Winners). Vet visit $280. Higher hydro ($165). |
| **Jan 2026** | New Year dinner out $95 (tag: DATE NIGHT). Running shoes $160 (MEC, tag: RUNNING). Savings Goals top-up: extra $1,000 → Scotiabank Savings (Emergency Fund). |
| **Feb 2026** | Cottage weekend — 5–6 transactions tagged COTTAGE WEEKEND: AirBnb $320, groceries $85, gas $78, restaurant $52, LCBO $45. Valentine's dinner $85 (tag: DATE NIGHT). |
| **Mar 2026** | Backyard Patio project starts — Home Depot $650, $420. Spring car maintenance $210 (Canadian Tire). RRSP deadline top-up $2,000 → WS RRSP. |

### 5d. Transaction Properties

- **Clearing status**: Transactions older than 14 days → `RECONCILED`. 3–14 days → `CLEARED`. < 3 days → `UNCLEARED`.
- **Transfer pairs**: Mortgage payment, car payment, CC payments, investment contributions, ATM withdrawals all create proper transfer pairs (`isTransfer: true`, matching `transferPairId`).
- **Origins**: All seeded transactions get `originType: MANUAL`.
- **Notes**: ~20% of transactions have a brief note (e.g., "Birthday gift for Mom", "Snow tires", "Team dinner").

### 5e. Transaction Splits

Create ~5–8 split transactions across the 6 months:
- Costco run split: Groceries $145 + Pharmacy $32 + Gifts $28
- Walmart split: Groceries $67 + Clothing $45
- Amazon split: Electronics $89 + Gifts $35
- Restaurant split: Restaurants $42 + Gifts $42 (paid for friend's birthday dinner)
- Home Depot split: Home Maintenance $120 + Backyard Patio $85

---

## 6. Category Assignments (Budget)

For each of the 6 months, create `CategoryAssignment` records. The budget should tell a realistic story:

| Category | Monthly Budget | Notes |
|---|---|---|
| Mortgage | $1,580 | Fixed |
| Property Tax | $285 | Fixed |
| Home Insurance | $108 | Fixed |
| Home Maintenance | $100 | Bumps to $200 in Mar |
| Furniture & Decor | $50 | $400 in Nov (Black Friday) |
| Hydro | $100–$165 | Seasonal variation |
| Internet | $90 | Fixed |
| Phone | $55 | Fixed |
| Groceries | $650 | Consistent |
| Restaurants | $150 | |
| Coffee Shops | $50 | |
| Food Delivery | $80 | |
| Car Payment | $425 | Fixed |
| Auto Insurance | $142 | Fixed |
| Gas | $220 | |
| Parking | $30 | |
| Car Maintenance | $50 | $250 in Mar |
| Mango (food & supplies) | $80 | |
| Vet | $0 | $300 in Dec, $180 in Feb |
| Clothing | $60 | |
| Haircuts & Grooming | $40 | |
| Healthcare | $30 | |
| Pharmacy | $25 | |
| Sports & Fitness | $80 | |
| Entertainment | $60 | |
| Hobbies | $30 | |
| Subscriptions | $45 | |
| Electronics | $0 | $100 in Nov |
| Gifts | $50 | $400 in Dec |
| Online Shopping | $50 | $350 in Nov |
| Emergency Fund | $200 | $1,200 in Jan |
| Vacation Fund | $150 | |
| RRSP Contribution | $375 | $2,375 in Mar |
| TFSA Contribution | $500 | Fixed |
| Backyard Patio 2026 | $0 | $1,200 in Mar |
| Iceland Trip 2026 | $200 | Starts in Jan |

Total monthly budget is roughly equal to income (~$8,200), with slight over/under each month for realism. Some months should be slightly over-budget in certain categories (overspending in red).

---

## 7. Import Batches (optional realism)

Create 2 processed import batches to show the CSV import feature has been used:

1. **CIBC Visa Jan statement** — `cibc-visa-statement-2026-01.csv`, 28 rows, 25 matched, 3 created
2. **TD Chequing Feb statement** — `td-chequing-statement-2026-02.csv`, 18 rows, 15 matched, 2 created, 1 skipped

These just need the `ImportBatch` rows — no need to seed full `ImportedTransaction` rows.

---

## 8. Implementation Plan

### File structure

```
packages/db/prisma/
  seed.ts              ← entry point (keep slim, orchestrates modules)
  seed/
    accounts.ts        ← account + loan profile definitions
    categories.ts      ← category group + category definitions
    payees.ts          ← payee definitions with default category mappings
    tags.ts            ← tag definitions
    transactions.ts    ← transaction generation logic (recurring + variable + one-offs)
    assignments.ts     ← monthly category assignment budgets
    imports.ts         ← import batch stubs
    helpers.ts         ← seeded PRNG, date utils, transfer pair creator
```

### Key implementation details

1. **Idempotent**: Wipe all data with `$transaction` + truncate in dependency order before seeding. This is a demo seeder — it owns the full DB state.
2. **Deterministic**: Use a seeded PRNG (e.g., simple mulberry32 or import `seedrandom`) so the exact same data is produced every run. Seed value: `"ledgr-demo-2026"`.
3. **Sort orders**: Use `generateNKeysBetween` from `@ledgr/shared` for category/group sort orders.
4. **Transfer pairs**: For each transfer (mortgage, car, CC payment, investments, ATM), create two `Transaction` rows with `isTransfer: true` and matching `transferPairId` (use a shared cuid).
5. **Normalized payee names**: Lowercase, stripped of special chars (matching existing logic).
6. **Transaction origins**: Every transaction gets a `TransactionOrigin` with `originType: MANUAL`.
7. **Transaction tags**: Apply tags to relevant transactions via `TransactionTag` join records.
8. **Transaction splits**: Create `TransactionSplit` rows for the designated split transactions, with amounts summing to the parent transaction's `amountMinor`.
9. **Amounts**: All stored as integer cents (`amountMinor`). Negative = outflow, positive = inflow.

### Running

```bash
pnpm db:seed          # drops + re-seeds everything
```

The existing `package.json` prisma seed config points to `seed.ts` — no config changes needed.

---

## 9. Expected Volume

| Entity | Count |
|---|---|
| Accounts | 9 |
| Category Groups | 11 |
| Categories | ~35 |
| Payees | ~40 |
| Tags | 10 |
| Transactions | ~400 |
| Transaction Splits | ~15–20 split rows across 5–8 parent txns |
| Transaction Tags | ~25–30 |
| Category Assignments | ~35 categories × 6 months = ~210 |
| Import Batches | 2 |

This produces a dense, realistic-feeling dataset for demos — enough history to show trends, budget vs. actual comparisons, and feature depth without being overwhelming.

---

## 10. Implementation TODO

### Phase 0 — Scaffolding & Helpers

- [x] Create `packages/db/prisma/seed/` directory
- [x] Create `helpers.ts`
  - [x] Implement seeded PRNG (mulberry32) with seed `"ledgr-demo"`
  - [x] `randomInt(min, max)` — returns integer in range using seeded PRNG
  - [x] `randomChoice(arr)` — pick random element from array
  - [x] `weightedChoice(arr, weights)` — weighted random selection
  - [x] `randomDate(year, month, dayMin, dayMax)` — random day within a month range
  - [x] `monthsInRange(today)` — compute the 6 month keys (`YYYY-MM`) ending at current month
  - [x] `startOfRange(today)` — compute the first day of the 6-month window
  - [x] `clearingStatusForDate(txDate, today)` — returns RECONCILED / CLEARED / UNCLEARED based on age
  - [x] `normalizeName(name)` — lowercase, strip special chars (match existing payee normalization)
  - [x] `generateTransferPairId()` — wrapper around `crypto.randomUUID()` for transfer pair IDs

### Phase 1 — Static Data Definitions

- [x] Create `categories.ts`
  - [x] Define all 11 category groups with emoji-prefixed names
  - [x] Define all ~35 categories nested under their groups, with `isIncomeCategory` flag
  - [x] Export as typed array of `{ groupName, categories: { name, isIncomeCategory }[] }`
- [x] Create `accounts.ts`
  - [x] Define 9 accounts with name, type, startingBalanceMinor
  - [x] Define loan profiles for Honda CR-V Loan and Scotiabank Mortgage
  - [x] Export as typed arrays
- [x] Create `payees.ts`
  - [x] Define ~47 payees with name and default category name
  - [x] Export as typed array
- [x] Create `tags.ts`
  - [x] Define 10 tags with name, normalizedName, description, backgroundColor, textColor
  - [x] Export as typed array

### Phase 2 — Transaction Generation Logic

- [x] Create `transactions.ts`
  - [x] **Recurring generator**: for each month in the 6-month range, emit fixed transactions:
    - [x] Mortgage payment (transfer pair to Scotiabank Mortgage loan account)
    - [x] Property tax
    - [x] Car payment (transfer pair to Honda CR-V Loan account)
    - [x] Auto insurance
    - [x] Internet (Bell Canada)
    - [x] Phone (Telus)
    - [x] Hydro (seasonal amount: higher Dec–Feb, lower Oct/Mar)
    - [x] Home insurance
    - [x] Two paycheques (15th and 28th) as income to Ready to Assign
    - [x] Subscriptions (Netflix, Spotify, Apple on 20th)
    - [x] TFSA contribution (transfer pair to Wealthsimple TFSA)
    - [x] RRSP contribution (transfer pair to Wealthsimple RRSP)
    - [x] CC payment (transfer from TD Chequing → CIBC Visa, randomized amount)
  - [x] **Variable spending generator**: for each month, use seeded PRNG to emit:
    - [x] Groceries: 8–12 tx, weighted payee selection, 70/30 CIBC Visa / TD Chequing split
    - [x] Restaurants: 3–5 tx, tag ~1/month as DATE NIGHT
    - [x] Coffee shops: 4–8 tx on TD Visa Infinite
    - [x] Food delivery: 2–3 tx
    - [x] Gas: 3–4 tx on TD Visa Infinite
    - [x] Pet expenses: 1–2 tx/month from PetSmart
    - [x] Sports & fitness: 2–3 tx, tag with HOCKEY or RUNNING
    - [x] Entertainment: 2–3 tx
    - [x] Shopping: 1–3 tx (Amazon, Canadian Tire, Home Depot, Winners)
    - [x] Cash withdrawals: 1–2 ATM transfers (TD Chequing → Cash Wallet) + 2–3 small cash purchases
  - [x] **One-off / seasonal generator**: emit specific transactions per month:
    - [x] Month 1 (6 months ago): snow tires $185, hockey registration $350 (tag: HOCKEY)
    - [x] Month 2: Black Friday — Amazon $340, IKEA $340, Sport Chek $95, MEC jacket $280
    - [x] Month 3: Holiday gifts ~$400 across 4–5 txns (tag: GIFTS), vet visit $280 (tag: PET)
    - [x] Month 4: New Year dinner $95 (tag: DATE NIGHT), running shoes $160 (tag: RUNNING), extra $1,000 to Scotiabank Savings
    - [x] Month 5: Cottage weekend 5–6 txns (tag: COTTAGE WEEKEND), Valentine's dinner $85 (tag: DATE NIGHT)
    - [x] Month 6 (current): Backyard patio — Home Depot $650 + $420 (tag: HOME PROJECT), car maintenance $210, RRSP top-up $2,000
  - [x] Export a function `generateAllTransactions(monthKeys, today)` returning a flat array of transaction descriptors

### Phase 3 — Split Transactions

- [x] Within `transactions.ts`, define 5 split transactions:
  - [x] Costco split: Groceries $145 + Pharmacy $32 + Gifts $28
  - [x] Walmart split: Groceries $67 + Clothing $45
  - [x] Amazon split: Electronics $89 + Gifts $35
  - [x] Restaurant split: Restaurants $42 + Gifts $42
  - [x] Home Depot split: Home Maintenance $120 + Backyard Patio $85
- [x] Mark parent transactions with a `splits` array; each split has `{ categoryName, payeeName?, note?, amountMinor }`
- [x] Ensure split amounts sum to parent `amountMinor` ✅ verified via SQL

### Phase 4 — Category Assignments (Budget)

- [x] Create `assignments.ts`
  - [x] Define a base monthly budget table (~35 categories with default amounts)
  - [x] Define per-month overrides for seasonal variation:
    - [x] Hydro: higher in winter months
    - [x] Furniture & Decor: $400 in month 2 (Black Friday)
    - [x] Vet: $300 in month 3, $180 in month 5
    - [x] Electronics: $100 in month 2
    - [x] Gifts: $400 in month 3 (holidays)
    - [x] Online Shopping: $350 in month 2
    - [x] Emergency Fund: $1,200 in month 4
    - [x] RRSP Contribution: $2,375 in month 6 (deadline top-up)
    - [x] Home Maintenance: $200 in month 6
    - [x] Car Maintenance: $250 in month 6
    - [x] Backyard Patio: $1,200 in month 6
    - [x] Iceland Trip: $200 starting month 4
  - [x] Export a function `generateAssignments(monthKeys)` returning `{ month, categoryName, assignedMinor }[]`

### Phase 5 — Import Batch Stubs

- [x] Create `imports.ts`
  - [x] Define 2 `ImportBatch` records (CIBC Visa Jan + TD Chequing Feb)
  - [x] Include fileName, status: PROCESSED, row counts
  - [x] Export as typed array

### Phase 6 — Seed Orchestrator (`seed.ts`)

- [x] Rewrite `seed.ts` as the orchestrator:
  - [x] Compute `today = new Date()` and derive `startDate`, `monthKeys`
  - [x] **Truncate all tables** in dependency order via CASCADE
  - [x] **Seed category groups & categories** — use `generateNKeysBetween` for sort orders, build `categoryMap` (name → id)
  - [x] **Seed accounts** — create all 9, then create loan profiles for the 2 loan accounts, build `accountMap` (name → id)
  - [x] **Seed payees** — create all with normalized names and default category lookups, build `payeeMap` (name → id)
  - [x] **Seed tags** — create all 10, build `tagMap` (name → id)
  - [x] **Seed transactions** — call `generateAllTransactions()`, iterate and create:
    - [x] For each regular transaction: create `Transaction` + `TransactionOrigin`
    - [x] For each transfer: create both sides with shared `transferPairId`, `isTransfer: true`
    - [x] For each tagged transaction: create `TransactionTag` join record(s)
    - [x] For each split transaction: create parent `Transaction` + child `TransactionSplit` rows
  - [x] **Seed category assignments** — call `generateAssignments()`, bulk create
  - [x] **Seed import batches** — create the 2 stub records
  - [x] Log summary counts to console on completion

### Phase 7 — Validation & Testing

- [x] Run `pnpm db:seed` and verify it completes without errors
- [x] Verify transaction count is ~400 (425 transactions)
- [x] Verify transfer pairs are balanced (all pairs sum to 0) ✅
- [x] Verify split transactions: split amounts sum to parent amount (all diffs = 0) ✅
- [x] Verify category assignments exist for all 6 months (32–34 per month) ✅
- [x] Verify all 10 tags are linked to appropriate transactions (64 tag links) ✅
- [x] Run `pnpm typecheck` — 0 errors ✅
- [x] Run `pnpm lint` — 0 errors (52 pre-existing warnings) ✅
- [ ] Run the app (`pnpm dev:api` + `pnpm dev:web`) and visually verify:
  - [ ] Accounts page shows all 9 accounts with correct balances
  - [ ] Budget page shows 6 months of assignments with activity
  - [ ] Transactions list shows recent transactions with payees, categories, tags
  - [ ] Transfer transactions display correctly
- [x] Re-run `pnpm db:seed` a second time to verify idempotency (clean wipe + reseed) ✅
