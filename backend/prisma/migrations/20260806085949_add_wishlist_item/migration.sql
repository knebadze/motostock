-- CreateEnum
CREATE TYPE "dbo"."WishlistItemType" AS ENUM ('PRODUCT', 'VEHICLE_LISTING');

-- CreateTable
CREATE TABLE "dbo"."WishlistItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "itemType" "dbo"."WishlistItemType" NOT NULL,
    "productId" INTEGER,
    "vehicleListingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "dbo"."WishlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "dbo"."WishlistItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_vehicleListingId_key" ON "dbo"."WishlistItem"("userId", "vehicleListingId");

-- AddForeignKey
ALTER TABLE "dbo"."WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."WishlistItem" ADD CONSTRAINT "WishlistItem_vehicleListingId_fkey" FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
