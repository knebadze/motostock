-- CreateEnum
CREATE TYPE "dbo"."VehicleListingCurrency" AS ENUM ('GEL', 'USD');

-- AlterTable
ALTER TABLE "dbo"."VehicleListing" ADD COLUMN     "priceCurrency" "dbo"."VehicleListingCurrency" NOT NULL DEFAULT 'GEL';

-- AlterEnum
ALTER TYPE "dbo"."ScheduledJobKey" ADD VALUE 'FETCH_USD_GEL_RATE';
