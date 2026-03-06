-- CreateIndex
CREATE INDEX "Transaction_accountId_cleared_date_idx"
ON "Transaction"("accountId", "cleared", "date");

-- CreateIndex
CREATE INDEX "Transaction_isTransfer_date_idx"
ON "Transaction"("isTransfer", "date");
