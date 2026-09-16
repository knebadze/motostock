-- AlterTable
ALTER TABLE "dbo"."HeroSlide" ADD COLUMN     "discountPromoCodeId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "HeroSlide_discountPromoCodeId_key" ON "dbo"."HeroSlide"("discountPromoCodeId");

-- AddForeignKey
ALTER TABLE "dbo"."HeroSlide" ADD CONSTRAINT "HeroSlide_discountPromoCodeId_fkey" FOREIGN KEY ("discountPromoCodeId") REFERENCES "dbo"."PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
