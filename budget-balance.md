# Budget Balance: Move Money & Cover Overspending

## What YNAB Does

When you click a category's **Available** balance in YNAB:

- **Positive balance** → "Move" dialog: choose an amount and a destination (another category or "Ready to Assign")
- **Negative balance** → "Cover overspending from" dialog: choose a source category (with positive available) or "Ready to Assign"

"Ready to Assign" acts as the unallocated pool — income that hasn't been assigned to any category yet.

---

## What Our App Does Today

- **Available** = `priorAssigned + priorActivity + currentAssigned + currentActivity` (cumulative carryover)
- **Ready to Assign** = `totalIncomeThroughMonth - totalAssignedThroughMonth` (already calculated and shown in toolbar)
- **Auto-cover** increases all underfunded category assignments in bulk — sourcing implicitly from Ready to Assign (it increases total assigned, which decreases Ready to Assign)
- No per-category "move money" or "cover from specific category" exists

---

## What "Moving Money" Actually Means in the Database

This is the key insight: **moving money between categories is just adjusting CategoryAssignment records.** No new tables, no new transaction types. It's pure assignment arithmetic.

### Move $200 from Groceries → Rent (same month)

```
Groceries.assignedMinor -= 20000
Rent.assignedMinor      += 20000
```

Both updates in one `prisma.$transaction`. Total assigned stays the same, so Ready to Assign is unchanged. Groceries available drops by $200, Rent available rises by $200.

### Move $200 from Groceries → Ready to Assign

```
Groceries.assignedMinor -= 20000
```

That's it. One update. Total assigned decreases by $200, so Ready to Assign increases by $200 automatically. No record to touch for "Ready to Assign" — it's a derived value.

### Cover $428.94 overspending on Phone from Mortgage

```
Phone.assignedMinor     += 42894
Mortgage.assignedMinor  -= 42894
```

Same as a move, but the UI framing is inverted (you're choosing the *source*, not the destination).

### Cover $428.94 overspending on Phone from Ready to Assign

```
Phone.assignedMinor += 42894
```

One update. Total assigned increases, Ready to Assign decreases by $428.94 automatically.

### Summary

| Operation | From assignment | To assignment | Ready to Assign |
|-----------|----------------|---------------|-----------------|
| Category → Category | -amount | +amount | unchanged |
| Category → RTA | -amount | (nothing) | +amount (auto) |
| RTA → Category | (nothing) | +amount | -amount (auto) |

**Conclusion: no schema changes needed.** The existing `CategoryAssignment` table and `setBulkCategoryAssignments` service handle everything. A "move" is just 1-2 assignment upserts in a transaction.

---

## Proposed API

### `POST /api/planning/move`

```ts
{
  month: string                           // "2026-03"
  fromCategoryId: string | "ready-to-assign"
  toCategoryId: string | "ready-to-assign"
  amountMinor: number                     // always positive
}
```

**Server logic:**

```ts
const updates = []

if (fromCategoryId !== "ready-to-assign") {
  const current = await getCurrentAssignment(month, fromCategoryId)
  updates.push({
    month,
    categoryId: fromCategoryId,
    assignedMinor: current.assignedMinor - amountMinor,
  })
}

if (toCategoryId !== "ready-to-assign") {
  const current = await getCurrentAssignment(month, toCategoryId)
  updates.push({
    month,
    categoryId: toCategoryId,
    assignedMinor: current.assignedMinor + amountMinor,
  })
}

await setBulkCategoryAssignments(updates)
```

**Validation:**
- `amountMinor` must be > 0
- `fromCategoryId` and `toCategoryId` can't both be `"ready-to-assign"`
- `fromCategoryId` !== `toCategoryId`
- Both category IDs must exist and not be income categories (unless it's RTA)

**No need for explicit balance checks** — the user might intentionally make a category go negative, just like YNAB allows it. The UI can show warnings, but the API shouldn't block it.

---

## Proposed UI

### Clicking a Positive Available Balance

A popover/dropdown appears anchored to the available badge:

```
┌─────────────────────────────┐
│  Move                       │
│  ┌───────────────────────┐  │
│  │ 200.00                │  │  ← pre-filled with available amount, editable
│  └───────────────────────┘  │
│                             │
│  To                         │
│  ┌───────────────────────▾┐ │
│  │ Select category...     │ │  ← dropdown with RTA + all expense categories
│  └────────────────────────┘ │
│                             │
│  [Cancel]  [Move]           │
└─────────────────────────────┘
```

**Dropdown contents:**
- "Ready to Assign" (with current RTA balance)
- All non-income categories grouped by CategoryGroup (with their available balances, excluding the current category)
- Categories with negative available shown in red (valid targets for covering)

### Clicking a Negative Available Balance

```
┌──────────────────────────────────┐
│  Cover overspending from         │
│  ┌────────────────────────────▾┐ │
│  │ Select source...            │ │  ← only categories with positive available + RTA
│  └─────────────────────────────┘ │
│                                  │
│  Amount pre-filled: $428.94      │  ← abs(available), editable for partial cover
│                                  │
│  [Cancel]  [Cover]               │
└──────────────────────────────────┘
```

**Dropdown contents:**
- "Ready to Assign" (with balance, only if RTA > 0)
- All expense categories with `availableMinor > 0`, grouped by CategoryGroup, showing their available balance
- Selecting a source that has less available than the deficit is allowed (partial cover, or it makes the source negative)

### Interaction Details

- **Click the available badge** (the colored span) to trigger the popover
- Amount field is pre-filled but editable for partial moves
- After confirming, the planning data refetches and all balances update
- The popover closes on confirm, cancel, or clicking outside
- Income categories never show the popover (they don't have Available)

---

## Do We Need a Dedicated "Ready to Assign" Entity?

**No.** Ready to Assign is already a derived value (`income - assigned`) that we calculate and display. The sentinel value `"ready-to-assign"` in the API is enough to handle it:

- Moving TO RTA = just decrease the source assignment (RTA goes up automatically)
- Moving FROM RTA = just increase the target assignment (RTA goes down automatically)

Creating a dedicated entity (a special category, a pool record, etc.) would add complexity with no benefit. The math already works.

---

## How This Relates to Existing Auto-Cover

Auto-cover is essentially a **bulk "cover from Ready to Assign"** operation. It:
1. Finds all categories where `availableMinor < 0`
2. Increases each category's assignment by `abs(availableMinor)`
3. This increases total assigned, which decreases Ready to Assign

The new move/cover feature is the **per-category, user-directed** version. Both features should coexist:

- **Auto-cover**: quick one-click "fix everything from RTA" (already built)
- **Move/cover popover**: granular control over where the money comes from

No changes needed to auto-cover.

---

## What About an Audit Trail?

Moving money is just changing assignments. The `updatedAt` timestamp on `CategoryAssignment` records when they change, but there's no log of "user moved $200 from X to Y on this date."

**Options:**
1. **Don't track it** (simplest, what YNAB does) — assignments are the source of truth, and the budget view reflects current state. Users don't typically need a move history.
2. **Add a BudgetMove log table** — records `{id, month, fromCategoryId, toCategoryId, amountMinor, createdAt}`. Purely informational, doesn't affect calculations. Could be useful for a future "budget activity" view.

**Recommendation: start without it.** We can always add a log table later if users want to see move history. The operations are idempotent and the budget state is always consistent regardless.

---

## Implementation Checklist

### Backend
- [ ] Add `POST /api/planning/move` route
- [ ] Add `moveBudget` service function (reads current assignments, applies delta, calls `setBulkCategoryAssignments`)
- [ ] Add validation (positive amount, valid categories, not both RTA)
- [ ] Add domain tests for move logic

### Frontend
- [ ] Add `MoveMoneyPopover` component (for positive available)
- [ ] Add `CoverOverspendingPopover` component (for negative available)
- [ ] Make the available balance badge clickable in `PlanningCategoryRow`
- [ ] Add category selector dropdown (grouped, with balances)
- [ ] Add `useMoveBudget` mutation hook
- [ ] Wire up popover open/close state in planning tab

### Nice-to-haves (later)
- [ ] Show warning when move would make source category negative
- [ ] Show warning when move would make RTA negative
- [ ] Keyboard support (arrow keys in category dropdown)
- [ ] Animation on balance changes after a move

---

## Edge Cases to Consider

1. **Move more than available**: Allowed. Source goes negative. UI shows a warning, doesn't block.
2. **Move when RTA is already negative**: Allowed for moving TO RTA (it reduces the negative). Warning when covering FROM RTA if it would go more negative.
3. **Partial cover**: User edits the amount to cover only part of the deficit. The category stays negative by the remaining amount.
4. **Zero amount**: Reject (API returns 400).
5. **Move to self**: Reject (API returns 400, but UI should prevent this by excluding the current category from the dropdown).
6. **Concurrent moves**: The `prisma.$transaction` ensures atomicity. Two simultaneous moves might both read stale assignments, but this is the same race condition that exists with the current assignment editing. Acceptable for a single-user app.
7. **Income categories**: Excluded from both source and destination dropdowns (they don't participate in the envelope system).
