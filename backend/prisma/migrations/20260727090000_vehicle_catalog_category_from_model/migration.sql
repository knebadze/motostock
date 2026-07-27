-- DropForeignKey
ALTER TABLE "dbo"."VehicleCatalog" DROP CONSTRAINT "VehicleCatalog_categoryId_fkey";

-- DropIndex
DROP INDEX "dbo"."VehicleCatalog_categoryId_idx";

-- AlterTable
ALTER TABLE "dbo"."VehicleCatalog" DROP COLUMN "categoryId";

-- AlterTable (Model.categoryId becomes required: a model always belongs to exactly one category)
ALTER TABLE "cla"."Model" ALTER COLUMN "categoryId" SET NOT NULL;
