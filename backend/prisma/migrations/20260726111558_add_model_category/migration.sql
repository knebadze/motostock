-- AlterTable
ALTER TABLE "cla"."Model" ADD COLUMN     "categoryId" INTEGER;

-- AddForeignKey
ALTER TABLE "cla"."Model" ADD CONSTRAINT "Model_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
