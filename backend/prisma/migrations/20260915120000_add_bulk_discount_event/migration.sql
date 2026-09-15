-- CreateEnum
CREATE TYPE "dbo"."BulkDiscountEventTargetType" AS ENUM ('PRODUCT', 'VEHICLE_LISTING');

-- CreateTable
CREATE TABLE "dbo"."BulkDiscountEvent" (
    "id" SERIAL NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "descriptionKa" TEXT,
    "descriptionEn" TEXT,
    "descriptionRu" TEXT,
    "imageUrl" TEXT,
    "targetType" "dbo"."BulkDiscountEventTargetType" NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkDiscountEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "dbo"."ProductVariantDiscount" ADD COLUMN     "bulkDiscountEventId" INTEGER;

-- AlterTable
ALTER TABLE "dbo"."VehicleListingDiscount" ADD COLUMN     "bulkDiscountEventId" INTEGER;

-- CreateIndex
CREATE INDEX "ProductVariantDiscount_bulkDiscountEventId_idx" ON "dbo"."ProductVariantDiscount"("bulkDiscountEventId");

-- CreateIndex
CREATE INDEX "VehicleListingDiscount_bulkDiscountEventId_idx" ON "dbo"."VehicleListingDiscount"("bulkDiscountEventId");

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariantDiscount" ADD CONSTRAINT "ProductVariantDiscount_bulkDiscountEventId_fkey" FOREIGN KEY ("bulkDiscountEventId") REFERENCES "dbo"."BulkDiscountEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListingDiscount" ADD CONSTRAINT "VehicleListingDiscount_bulkDiscountEventId_fkey" FOREIGN KEY ("bulkDiscountEventId") REFERENCES "dbo"."BulkDiscountEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
