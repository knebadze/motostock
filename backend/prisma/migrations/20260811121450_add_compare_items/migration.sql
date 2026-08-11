-- CreateEnum
CREATE TYPE "dbo"."CompareItemType" AS ENUM ('PRODUCT', 'VEHICLE_LISTING');

-- CreateTable
CREATE TABLE "dbo"."CompareItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "itemType" "dbo"."CompareItemType" NOT NULL,
    "productId" INTEGER,
    "vehicleListingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompareItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompareItem_userId_idx" ON "dbo"."CompareItem"("userId");

-- CreateIndex
CREATE INDEX "CompareItem_guestId_idx" ON "dbo"."CompareItem"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_userId_productId_key" ON "dbo"."CompareItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_userId_vehicleListingId_key" ON "dbo"."CompareItem"("userId", "vehicleListingId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_guestId_productId_key" ON "dbo"."CompareItem"("guestId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_guestId_vehicleListingId_key" ON "dbo"."CompareItem"("guestId", "vehicleListingId");

-- AddForeignKey
ALTER TABLE "dbo"."CompareItem" ADD CONSTRAINT "CompareItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."CompareItem" ADD CONSTRAINT "CompareItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."CompareItem" ADD CONSTRAINT "CompareItem_vehicleListingId_fkey" FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

