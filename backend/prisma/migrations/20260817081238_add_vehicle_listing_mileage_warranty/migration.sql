-- CreateEnum
CREATE TYPE "dbo"."WarrantyUnit" AS ENUM ('YEAR', 'MONTH');

-- AlterTable
ALTER TABLE "dbo"."VehicleListing" ADD COLUMN     "mileageKm" INTEGER,
ADD COLUMN     "warrantyUnit" "dbo"."WarrantyUnit",
ADD COLUMN     "warrantyValue" INTEGER;

