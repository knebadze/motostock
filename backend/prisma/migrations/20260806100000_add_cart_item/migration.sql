-- CreateEnum
CREATE TYPE "dbo"."CartItemType" AS ENUM ('PRODUCT_VARIANT', 'VEHICLE_LISTING');

-- CreateTable
CREATE TABLE "dbo"."CartItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "itemType" "dbo"."CartItemType" NOT NULL,
    "productVariantId" INTEGER,
    "vehicleListingId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItem_userId_idx" ON "dbo"."CartItem"("userId");

-- CreateIndex
CREATE INDEX "CartItem_guestId_idx" ON "dbo"."CartItem"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_productVariantId_key" ON "dbo"."CartItem"("userId", "productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_vehicleListingId_key" ON "dbo"."CartItem"("userId", "vehicleListingId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_guestId_productVariantId_key" ON "dbo"."CartItem"("guestId", "productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_guestId_vehicleListingId_key" ON "dbo"."CartItem"("guestId", "vehicleListingId");

-- AddForeignKey
ALTER TABLE "dbo"."CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."CartItem" ADD CONSTRAINT "CartItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "dbo"."ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."CartItem" ADD CONSTRAINT "CartItem_vehicleListingId_fkey" FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
