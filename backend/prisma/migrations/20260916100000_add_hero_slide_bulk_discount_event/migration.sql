-- AlterTable
ALTER TABLE "dbo"."HeroSlide" ADD COLUMN     "discountBulkEventId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "HeroSlide_discountBulkEventId_key" ON "dbo"."HeroSlide"("discountBulkEventId");

-- AddForeignKey
ALTER TABLE "dbo"."HeroSlide" ADD CONSTRAINT "HeroSlide_discountBulkEventId_fkey" FOREIGN KEY ("discountBulkEventId") REFERENCES "dbo"."BulkDiscountEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
