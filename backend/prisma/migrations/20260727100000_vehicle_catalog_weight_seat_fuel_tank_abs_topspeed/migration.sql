-- AlterTable
ALTER TABLE "dbo"."VehicleCatalog"
  ADD COLUMN "weightKg" INTEGER,
  ADD COLUMN "seatHeightMm" INTEGER,
  ADD COLUMN "fuelTankLiters" DECIMAL(4,1),
  ADD COLUMN "topSpeedKmh" INTEGER,
  ADD COLUMN "hasAbs" BOOLEAN;
