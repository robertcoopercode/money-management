-- Step 1: Add month column to CategoryAssignment
ALTER TABLE "CategoryAssignment" ADD COLUMN "month" TEXT;

-- Step 2: Backfill month from BudgetMonth
UPDATE "CategoryAssignment" ca
SET "month" = bm."month"
FROM "BudgetMonth" bm
WHERE ca."budgetMonthId" = bm."id";

-- Step 3: Set month to NOT NULL
ALTER TABLE "CategoryAssignment" ALTER COLUMN "month" SET NOT NULL;

-- Step 4: Drop old FK constraint, indexes, and budgetMonthId column
ALTER TABLE "CategoryAssignment" DROP CONSTRAINT "CategoryAssignment_budgetMonthId_fkey";
DROP INDEX "CategoryAssignment_budgetMonthId_categoryId_key";
DROP INDEX "CategoryAssignment_categoryId_budgetMonthId_idx";
ALTER TABLE "CategoryAssignment" DROP COLUMN "budgetMonthId";

-- Step 5: Add new unique constraint and index
CREATE UNIQUE INDEX "CategoryAssignment_month_categoryId_key" ON "CategoryAssignment"("month", "categoryId");
CREATE INDEX "CategoryAssignment_categoryId_month_idx" ON "CategoryAssignment"("categoryId", "month");

-- Step 6: Drop BudgetMonth table
DROP TABLE "BudgetMonth";
