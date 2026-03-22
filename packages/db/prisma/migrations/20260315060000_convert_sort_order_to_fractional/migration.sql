-- Convert CategoryGroup.sortOrder from Int to String (fractional indexing)
ALTER TABLE "CategoryGroup" ADD COLUMN "sortOrder_new" TEXT NOT NULL DEFAULT 'a0';
UPDATE "CategoryGroup" SET "sortOrder_new" = CASE
  WHEN "sortOrder" = 0 THEN 'a0'
  WHEN "sortOrder" = 1 THEN 'a1'
  WHEN "sortOrder" = 2 THEN 'a2'
  WHEN "sortOrder" = 3 THEN 'a3'
  WHEN "sortOrder" = 4 THEN 'a4'
  WHEN "sortOrder" = 5 THEN 'a5'
  WHEN "sortOrder" = 6 THEN 'a6'
  WHEN "sortOrder" = 7 THEN 'a7'
  WHEN "sortOrder" = 8 THEN 'a8'
  WHEN "sortOrder" = 9 THEN 'a9'
  ELSE 'a' || chr(48 + "sortOrder")
END;
ALTER TABLE "CategoryGroup" DROP COLUMN "sortOrder";
ALTER TABLE "CategoryGroup" RENAME COLUMN "sortOrder_new" TO "sortOrder";

-- Convert Category.sortOrder from Int to String (fractional indexing)
ALTER TABLE "Category" ADD COLUMN "sortOrder_new" TEXT NOT NULL DEFAULT 'a0';
UPDATE "Category" SET "sortOrder_new" = CASE
  WHEN "sortOrder" = 0 THEN 'a0'
  WHEN "sortOrder" = 1 THEN 'a1'
  WHEN "sortOrder" = 2 THEN 'a2'
  WHEN "sortOrder" = 3 THEN 'a3'
  WHEN "sortOrder" = 4 THEN 'a4'
  WHEN "sortOrder" = 5 THEN 'a5'
  WHEN "sortOrder" = 6 THEN 'a6'
  WHEN "sortOrder" = 7 THEN 'a7'
  WHEN "sortOrder" = 8 THEN 'a8'
  WHEN "sortOrder" = 9 THEN 'a9'
  ELSE 'a' || chr(48 + "sortOrder")
END;
ALTER TABLE "Category" DROP COLUMN "sortOrder";
ALTER TABLE "Category" RENAME COLUMN "sortOrder_new" TO "sortOrder";
