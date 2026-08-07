-- AlterTable
-- OrderItem is brand new and empty (no orders have been placed yet), so this
-- swaps the single itemName column for the nameKa/nameEn/nameRu triplet
-- convention used by every other display string in this schema, instead of
-- a data-preserving rename.
ALTER TABLE "dbo"."OrderItem" DROP COLUMN "itemName";
ALTER TABLE "dbo"."OrderItem" ADD COLUMN "itemNameKa" TEXT NOT NULL DEFAULT '';
ALTER TABLE "dbo"."OrderItem" ADD COLUMN "itemNameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "dbo"."OrderItem" ADD COLUMN "itemNameRu" TEXT NOT NULL DEFAULT '';
ALTER TABLE "dbo"."OrderItem" ALTER COLUMN "itemNameKa" DROP DEFAULT;
ALTER TABLE "dbo"."OrderItem" ALTER COLUMN "itemNameEn" DROP DEFAULT;
ALTER TABLE "dbo"."OrderItem" ALTER COLUMN "itemNameRu" DROP DEFAULT;
