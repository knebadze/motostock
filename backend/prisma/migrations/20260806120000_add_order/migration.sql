-- CreateEnum
CREATE TYPE "dbo"."OrderFulfillmentMethod" AS ENUM ('COURIER_CARD', 'PICKUP');

-- CreateEnum
CREATE TYPE "dbo"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "dbo"."Order" (
    "id" SERIAL NOT NULL,
    "orderCode" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "fulfillmentMethod" "dbo"."OrderFulfillmentMethod" NOT NULL,
    "status" "dbo"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "addressId" INTEGER,
    "shippingSnapshot" JSONB,
    "promoCodeId" INTEGER,
    "promoCodeSnapshot" TEXT,
    "promoDiscountPercent" DECIMAL(5,2),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "itemType" "dbo"."CartItemType" NOT NULL,
    "productVariantId" INTEGER,
    "vehicleListingId" INTEGER,
    "itemName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "dbo"."Order"("orderCode");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "dbo"."Order"("userId");

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "dbo"."Order"("addressId");

-- CreateIndex
CREATE INDEX "Order_promoCodeId_idx" ON "dbo"."Order"("promoCodeId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "dbo"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productVariantId_idx" ON "dbo"."OrderItem"("productVariantId");

-- CreateIndex
CREATE INDEX "OrderItem_vehicleListingId_idx" ON "dbo"."OrderItem"("vehicleListingId");

-- AddForeignKey
ALTER TABLE "dbo"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "dbo"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."Order" ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "dbo"."PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "dbo"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."OrderItem" ADD CONSTRAINT "OrderItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "dbo"."ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."OrderItem" ADD CONSTRAINT "OrderItem_vehicleListingId_fkey" FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
