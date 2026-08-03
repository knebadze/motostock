-- CreateEnum
CREATE TYPE "cla"."VehicleCategoryFilterType" AS ENUM ('PRICE', 'YEAR', 'BRAND', 'SPEC');

-- CreateEnum
CREATE TYPE "cla"."VehicleSpecField" AS ENUM ('FUEL_TYPE', 'TRANSMISSION_TYPE', 'COOLING_TYPE', 'FINAL_DRIVE_TYPE', 'DRIVE_TYPE', 'START_TYPE', 'POWERTRAIN_TYPE', 'ENGINE_VOLUME_CC', 'ENGINE_POWER_HP', 'CYLINDER_COUNT', 'GEAR_COUNT', 'SEAT_COUNT', 'WEIGHT_KG', 'SEAT_HEIGHT_MM', 'FUEL_TANK_LITERS', 'TOP_SPEED_KMH', 'MOTOR_POWER_WATT', 'BATTERY_CAPACITY_WH', 'RANGE_KM', 'CHARGING_TIME_MINUTES', 'HAS_ABS', 'HAS_LOCKING_DIFFERENTIAL');

-- CreateTable
CREATE TABLE "cla"."VehicleCategoryFilterConfig" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "filterType" "cla"."VehicleCategoryFilterType" NOT NULL,
    "specField" "cla"."VehicleSpecField",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCategoryFilterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleCategoryFilterConfig_categoryId_idx" ON "cla"."VehicleCategoryFilterConfig"("categoryId");

-- AddForeignKey
ALTER TABLE "cla"."VehicleCategoryFilterConfig" ADD CONSTRAINT "VehicleCategoryFilterConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
