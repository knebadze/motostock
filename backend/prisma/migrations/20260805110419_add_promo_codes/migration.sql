-- CreateEnum
CREATE TYPE "dbo"."PromoCodeDomain" AS ENUM ('PRODUCT', 'VEHICLE');

-- CreateTable
CREATE TABLE "dbo"."PromoCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "domain" "dbo"."PromoCodeDomain" NOT NULL,
    "categoryId" INTEGER,
    "productBrandId" INTEGER,
    "attributeId" INTEGER,
    "attributeOptionId" INTEGER,
    "brandId" INTEGER,
    "modelId" INTEGER,
    "specField" "cla"."VehicleSpecField",
    "specLookupItemId" INTEGER,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "dbo"."PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_domain_idx" ON "dbo"."PromoCode"("domain");

-- CreateIndex
CREATE INDEX "PromoCode_categoryId_idx" ON "dbo"."PromoCode"("categoryId");

-- CreateIndex
CREATE INDEX "PromoCode_productBrandId_idx" ON "dbo"."PromoCode"("productBrandId");

-- CreateIndex
CREATE INDEX "PromoCode_attributeId_idx" ON "dbo"."PromoCode"("attributeId");

-- CreateIndex
CREATE INDEX "PromoCode_brandId_idx" ON "dbo"."PromoCode"("brandId");

-- CreateIndex
CREATE INDEX "PromoCode_modelId_idx" ON "dbo"."PromoCode"("modelId");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_startDate_endDate_idx" ON "dbo"."PromoCode"("isActive", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "dbo"."PromoCode" ADD CONSTRAINT "PromoCode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."PromoCode" ADD CONSTRAINT "PromoCode_productBrandId_fkey" FOREIGN KEY ("productBrandId") REFERENCES "cla"."ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."PromoCode" ADD CONSTRAINT "PromoCode_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "cla"."Attribute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."PromoCode" ADD CONSTRAINT "PromoCode_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "cla"."AttributeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."PromoCode" ADD CONSTRAINT "PromoCode_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "cla"."Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."PromoCode" ADD CONSTRAINT "PromoCode_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "cla"."Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;
