-- Rename CHEQUING -> CASH, CREDIT_CARD -> CREDIT, add INVESTMENT and LOAN

CREATE TYPE "AccountType_new" AS ENUM ('CASH', 'CREDIT', 'INVESTMENT', 'LOAN');

ALTER TABLE "Account"
ALTER COLUMN "type" TYPE "AccountType_new"
USING (
  CASE "type"::text
    WHEN 'CHEQUING' THEN 'CASH'::"AccountType_new"
    WHEN 'CREDIT_CARD' THEN 'CREDIT'::"AccountType_new"
  END
);

ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('MORTGAGE', 'AUTO');

-- CreateTable
CREATE TABLE "LoanProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "loanType" "LoanType" NOT NULL,
    "interestRateAnnual" DECIMAL(8,6) NOT NULL,
    "minimumPaymentMinor" INTEGER NOT NULL,

    CONSTRAINT "LoanProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanProfile_accountId_key" ON "LoanProfile"("accountId");

-- AddForeignKey
ALTER TABLE "LoanProfile" ADD CONSTRAINT "LoanProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
