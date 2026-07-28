-- DropForeignKey
ALTER TABLE "dbo"."Product" DROP CONSTRAINT "Product_brandId_fkey";

-- DropIndex
DROP INDEX "dbo"."Product_brandId_idx";

-- AlterTable
ALTER TABLE "dbo"."Product" DROP COLUMN "brandId",
ADD COLUMN     "productBrandId" INTEGER;

-- CreateTable
CREATE TABLE "cla"."ProductBrand" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBrand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductBrand_slug_key" ON "cla"."ProductBrand"("slug");

-- CreateIndex
CREATE INDEX "ProductBrand_categoryId_idx" ON "cla"."ProductBrand"("categoryId");

-- CreateIndex
CREATE INDEX "Product_productBrandId_idx" ON "dbo"."Product"("productBrandId");

-- AddForeignKey
ALTER TABLE "cla"."ProductBrand" ADD CONSTRAINT "ProductBrand_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."Product" ADD CONSTRAINT "Product_productBrandId_fkey" FOREIGN KEY ("productBrandId") REFERENCES "cla"."ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
