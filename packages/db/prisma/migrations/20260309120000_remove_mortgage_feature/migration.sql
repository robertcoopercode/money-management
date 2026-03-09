-- Remove mortgage-specific storage and enum variants.
DROP TABLE "MortgageProfile";

DROP TYPE "PaymentFrequency";

UPDATE "Account"
SET "type" = 'CHEQUING'
WHERE "type" = 'MORTGAGE';

CREATE TYPE "AccountType_new" AS ENUM ('CHEQUING', 'CREDIT_CARD');

ALTER TABLE "Account"
ALTER COLUMN "type" TYPE "AccountType_new"
USING ("type"::text::"AccountType_new");

ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";

DROP TYPE "AccountType_old";
