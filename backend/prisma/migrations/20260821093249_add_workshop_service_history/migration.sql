-- CreateEnum
CREATE TYPE "dbo"."ServicePosition" AS ENUM ('FRONT', 'REAR', 'BOTH');

-- CreateTable
CREATE TABLE "dbo"."ServiceRecord" (
    "id" SERIAL NOT NULL,
    "garageVehicleId" INTEGER NOT NULL,
    "serviceTypeId" INTEGER,
    "customServiceName" TEXT,
    "mileageKm" INTEGER NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "position" "dbo"."ServicePosition",
    "filterChanged" BOOLEAN,
    "notes" TEXT,
    "recordedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."ServiceType" (
    "id" SERIAL NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "hasPositionOption" BOOLEAN NOT NULL DEFAULT false,
    "hasFilterOption" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRecord_garageVehicleId_idx" ON "dbo"."ServiceRecord"("garageVehicleId");

-- AddForeignKey
ALTER TABLE "dbo"."ServiceRecord" ADD CONSTRAINT "ServiceRecord_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "dbo"."GarageVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ServiceRecord" ADD CONSTRAINT "ServiceRecord_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "dbo"."ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ServiceRecord" ADD CONSTRAINT "ServiceRecord_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exactly one of serviceTypeId/customServiceName must be set — same "owner
-- xor" pattern as CartItem/WishlistItem's userId/guestId (see
-- 20260818093000_add_owner_xor_check_constraints).
ALTER TABLE "dbo"."ServiceRecord"
  ADD CONSTRAINT "ServiceRecord_service_xor_check"
  CHECK (("serviceTypeId" IS NOT NULL) <> ("customServiceName" IS NOT NULL));
