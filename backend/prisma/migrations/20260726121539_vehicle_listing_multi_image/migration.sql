/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `VehicleListing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "dbo"."VehicleListing" DROP COLUMN "imageUrl";

-- CreateTable
CREATE TABLE "dbo"."VehicleListingImage" (
    "id" SERIAL NOT NULL,
    "vehicleListingId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleListingImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListingImage" ADD CONSTRAINT "VehicleListingImage_vehicleListingId_fkey" FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
