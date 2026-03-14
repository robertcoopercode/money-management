-- CreateTable
CREATE TABLE "SplitTag" (
    "id" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SplitTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SplitTag_tagId_idx" ON "SplitTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "SplitTag_splitId_tagId_key" ON "SplitTag"("splitId", "tagId");

-- AddForeignKey
ALTER TABLE "SplitTag" ADD CONSTRAINT "SplitTag_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "TransactionSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitTag" ADD CONSTRAINT "SplitTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
