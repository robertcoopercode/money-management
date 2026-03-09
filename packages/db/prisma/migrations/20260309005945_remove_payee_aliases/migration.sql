/*
  Warnings:

  - You are about to drop the `PayeeAlias` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PayeeAlias" DROP CONSTRAINT "PayeeAlias_payeeId_fkey";

-- DropTable
DROP TABLE "PayeeAlias";
