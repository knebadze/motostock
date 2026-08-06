-- AlterTable
ALTER TABLE "dbo"."WishlistItem" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "dbo"."WishlistItem" ADD COLUMN "guestId" TEXT;

-- CreateIndex
CREATE INDEX "WishlistItem_guestId_idx" ON "dbo"."WishlistItem"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_guestId_productId_key" ON "dbo"."WishlistItem"("guestId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_guestId_vehicleListingId_key" ON "dbo"."WishlistItem"("guestId", "vehicleListingId");
