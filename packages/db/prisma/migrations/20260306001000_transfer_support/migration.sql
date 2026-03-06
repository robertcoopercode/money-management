-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "isTransfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transferAccountId" TEXT,
ADD COLUMN "transferPairId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_transferPairId_idx" ON "Transaction"("transferPairId");

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_transferAccountId_fkey"
FOREIGN KEY ("transferAccountId")
REFERENCES "Account"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
