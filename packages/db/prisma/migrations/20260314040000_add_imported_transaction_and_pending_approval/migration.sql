-- CreateTable
CREATE TABLE "ImportedTransaction" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "payeeName" TEXT NOT NULL,
    "note" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedTransaction_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "pendingApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Transaction" ADD COLUMN "importedTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ImportedTransaction_importBatchId_rowIndex_key" ON "ImportedTransaction"("importBatchId", "rowIndex");

-- CreateIndex
CREATE INDEX "ImportedTransaction_date_amountMinor_idx" ON "ImportedTransaction"("date", "amountMinor");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_importedTransactionId_key" ON "Transaction"("importedTransactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importedTransactionId_fkey" FOREIGN KEY ("importedTransactionId") REFERENCES "ImportedTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
