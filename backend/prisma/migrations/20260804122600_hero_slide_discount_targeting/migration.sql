-- AlterEnum
ALTER TYPE "dbo"."HeroSlideType" ADD VALUE 'DISCOUNT';

-- AlterTable
ALTER TABLE "dbo"."HeroSlide" ADD COLUMN     "discountCategoryId" INTEGER,
ADD COLUMN     "discountProductBrandId" INTEGER;

-- CreateIndex
CREATE INDEX "HeroSlide_discountCategoryId_idx" ON "dbo"."HeroSlide"("discountCategoryId");

-- CreateIndex
CREATE INDEX "HeroSlide_discountProductBrandId_idx" ON "dbo"."HeroSlide"("discountProductBrandId");

-- AddForeignKey
ALTER TABLE "dbo"."HeroSlide" ADD CONSTRAINT "HeroSlide_discountCategoryId_fkey" FOREIGN KEY ("discountCategoryId") REFERENCES "cla"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."HeroSlide" ADD CONSTRAINT "HeroSlide_discountProductBrandId_fkey" FOREIGN KEY ("discountProductBrandId") REFERENCES "cla"."ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
