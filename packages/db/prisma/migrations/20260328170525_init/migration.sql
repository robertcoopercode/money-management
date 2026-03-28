-- AlterTable
ALTER TABLE "LoanProfile" ADD COLUMN     "defaultCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "LoanProfile" ADD CONSTRAINT "LoanProfile_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
