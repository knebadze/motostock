-- AlterEnum
ALTER TYPE "dbo"."HomepageSectionType" ADD VALUE 'FEATURED_MIXED';

-- AlterTable
ALTER TABLE "dbo"."Product" ADD COLUMN     "isFeaturedOnHomepage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "dbo"."VehicleListing" ADD COLUMN     "isFeaturedOnHomepage" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_isFeaturedOnHomepage_idx" ON "dbo"."Product"("isFeaturedOnHomepage");

-- CreateIndex
CREATE INDEX "VehicleListing_isFeaturedOnHomepage_idx" ON "dbo"."VehicleListing"("isFeaturedOnHomepage");
