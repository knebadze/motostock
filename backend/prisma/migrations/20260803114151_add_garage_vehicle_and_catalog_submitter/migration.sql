-- AlterTable
ALTER TABLE "dbo"."VehicleCatalog" ADD COLUMN     "userId" INTEGER;

-- CreateTable
CREATE TABLE "dbo"."GarageVehicle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vehicleCatalogId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarageVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GarageVehicle_userId_idx" ON "dbo"."GarageVehicle"("userId");

-- CreateIndex
CREATE INDEX "GarageVehicle_vehicleCatalogId_idx" ON "dbo"."GarageVehicle"("vehicleCatalogId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_userId_idx" ON "dbo"."VehicleCatalog"("userId");

-- AddForeignKey
ALTER TABLE "dbo"."GarageVehicle" ADD CONSTRAINT "GarageVehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."GarageVehicle" ADD CONSTRAINT "GarageVehicle_vehicleCatalogId_fkey" FOREIGN KEY ("vehicleCatalogId") REFERENCES "dbo"."VehicleCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
