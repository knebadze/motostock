-- CreateEnum
CREATE TYPE "cla"."AttributeValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT');

-- CreateTable
CREATE TABLE "cla"."Size" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."Attribute" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "valueType" "cla"."AttributeValueType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."AttributeOption" (
    "id" SERIAL NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "labelKa" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelRu" TEXT NOT NULL,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."Product" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "brandId" INTEGER,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "descriptionKa" TEXT,
    "descriptionEn" TEXT,
    "descriptionRu" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sku" TEXT,
    "sizeId" INTEGER,
    "colorId" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 1,
    "conditionId" INTEGER,
    "statusId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."ProductVariantImage" (
    "id" SERIAL NOT NULL,
    "productVariantId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariantImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."ProductVariantDiscount" (
    "id" SERIAL NOT NULL,
    "productVariantId" INTEGER NOT NULL,
    "discountPrice" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariantDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."ProductAttributeValue" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,
    "valueText" TEXT,
    "valueNumber" DECIMAL(14,4),
    "valueBoolean" BOOLEAN,
    "optionId" INTEGER,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."ProductFitment" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "vehicleCatalogId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Size_key_key" ON "cla"."Size"("key");

-- CreateIndex
CREATE INDEX "Attribute_categoryId_idx" ON "cla"."Attribute"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_attributeId_key_key" ON "cla"."AttributeOption"("attributeId", "key");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "dbo"."Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "dbo"."Product"("brandId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "dbo"."ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_sizeId_idx" ON "dbo"."ProductVariant"("sizeId");

-- CreateIndex
CREATE INDEX "ProductVariant_colorId_idx" ON "dbo"."ProductVariant"("colorId");

-- CreateIndex
CREATE INDEX "ProductVariant_conditionId_idx" ON "dbo"."ProductVariant"("conditionId");

-- CreateIndex
CREATE INDEX "ProductVariant_statusId_idx" ON "dbo"."ProductVariant"("statusId");

-- CreateIndex
CREATE INDEX "ProductVariantImage_productVariantId_position_idx" ON "dbo"."ProductVariantImage"("productVariantId", "position");

-- CreateIndex
CREATE INDEX "ProductVariantDiscount_productVariantId_startDate_endDate_idx" ON "dbo"."ProductVariantDiscount"("productVariantId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key" ON "dbo"."ProductAttributeValue"("productId", "attributeId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_optionId_idx" ON "dbo"."ProductAttributeValue"("attributeId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFitment_productId_vehicleCatalogId_key" ON "dbo"."ProductFitment"("productId", "vehicleCatalogId");

-- CreateIndex
CREATE INDEX "ProductFitment_vehicleCatalogId_idx" ON "dbo"."ProductFitment"("vehicleCatalogId");

-- AddForeignKey
ALTER TABLE "cla"."Attribute" ADD CONSTRAINT "Attribute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cla"."AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "cla"."Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "cla"."Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariant" ADD CONSTRAINT "ProductVariant_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "cla"."Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariant" ADD CONSTRAINT "ProductVariant_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "cla"."Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariant" ADD CONSTRAINT "ProductVariant_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "cla"."Condition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariant" ADD CONSTRAINT "ProductVariant_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "cla"."ListingStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariantImage" ADD CONSTRAINT "ProductVariantImage_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "dbo"."ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductVariantDiscount" ADD CONSTRAINT "ProductVariantDiscount_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "dbo"."ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "cla"."Attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "cla"."AttributeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductFitment" ADD CONSTRAINT "ProductFitment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductFitment" ADD CONSTRAINT "ProductFitment_vehicleCatalogId_fkey" FOREIGN KEY ("vehicleCatalogId") REFERENCES "dbo"."VehicleCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
