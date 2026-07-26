/*
  Warnings:

  - Added the required column `year` to the `VehicleListing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dbo"."VehicleListing" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionKa" TEXT,
ADD COLUMN     "descriptionRu" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "year" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "dbo"."VehicleListingDiscount" (
    "id" SERIAL NOT NULL,
    "vehicleListingId" INTEGER NOT NULL,
    "discountPrice" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleListingDiscount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListingDiscount" ADD CONSTRAINT "VehicleListingDiscount_vehicleListingId_fkey" FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
