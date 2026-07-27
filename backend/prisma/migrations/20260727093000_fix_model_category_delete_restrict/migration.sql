-- The old FK was created back when Model.categoryId was nullable, so Prisma
-- generated it with ON DELETE SET NULL. That action was never updated when
-- the column became NOT NULL (see 20260727090000), so deleting a Category
-- still in use crashed with a null-constraint violation instead of being
-- blocked. Recreate it with ON DELETE RESTRICT, matching every other
-- required relation in this schema (e.g. VehicleCatalog_brandId_fkey).

-- DropForeignKey
ALTER TABLE "cla"."Model" DROP CONSTRAINT "Model_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "cla"."Model" ADD CONSTRAINT "Model_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
