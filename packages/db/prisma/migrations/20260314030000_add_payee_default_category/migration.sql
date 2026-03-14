-- AlterTable
ALTER TABLE "Payee" ADD COLUMN "defaultCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Payee" ADD CONSTRAINT "Payee_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
