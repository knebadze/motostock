-- AlterTable
ALTER TABLE "dbo"."VehicleCatalog" ADD COLUMN     "batteryCapacityWh" INTEGER,
ADD COLUMN     "chargingTimeMinutes" INTEGER,
ADD COLUMN     "hasLockingDifferential" BOOLEAN,
ADD COLUMN     "motorPowerWatt" INTEGER,
ADD COLUMN     "powertrainTypeId" INTEGER,
ADD COLUMN     "rangeKm" INTEGER;

-- CreateTable
CREATE TABLE "cla"."PowertrainType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "PowertrainType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PowertrainType_key_key" ON "cla"."PowertrainType"("key");

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_powertrainTypeId_fkey" FOREIGN KEY ("powertrainTypeId") REFERENCES "cla"."PowertrainType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
