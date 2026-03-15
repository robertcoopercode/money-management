-- CreateEnum
CREATE TYPE "ClearingStatus" AS ENUM ('UNCLEARED', 'CLEARED', 'RECONCILED');

-- AlterTable: add clearingStatus column with default
ALTER TABLE "Transaction" ADD COLUMN "clearingStatus" "ClearingStatus" NOT NULL DEFAULT 'UNCLEARED';

-- Backfill: set CLEARED for previously cleared transactions
UPDATE "Transaction" SET "clearingStatus" = 'CLEARED' WHERE "cleared" = true;

-- DropIndex
DROP INDEX IF EXISTS "Transaction_accountId_cleared_date_idx";

-- AlterTable: drop old cleared column
ALTER TABLE "Transaction" DROP COLUMN "cleared";

-- CreateIndex
CREATE INDEX "Transaction_accountId_clearingStatus_date_idx" ON "Transaction"("accountId", "clearingStatus", "date");
