-- DropIndex
DROP INDEX IF EXISTS "Category_groupId_name_key";

-- AlterTable: make groupId nullable, change onDelete to SetNull
ALTER TABLE "Category" ALTER COLUMN "groupId" DROP NOT NULL;

-- Add unique constraint on name only
ALTER TABLE "Category" ADD CONSTRAINT "Category_name_key" UNIQUE ("name");

-- Update foreign key to use SetNull instead of Cascade
ALTER TABLE "Category" DROP CONSTRAINT "Category_groupId_fkey";
ALTER TABLE "Category" ADD CONSTRAINT "Category_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CategoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
