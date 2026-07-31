-- CreateEnum
CREATE TYPE "cla"."CategoryFilterType" AS ENUM ('PRICE', 'BRAND', 'ATTRIBUTE');

-- CreateTable
CREATE TABLE "cla"."CategoryFilterConfig" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "filterType" "cla"."CategoryFilterType" NOT NULL,
    "attributeId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryFilterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryFilterConfig_categoryId_idx" ON "cla"."CategoryFilterConfig"("categoryId");

-- AddForeignKey
ALTER TABLE "cla"."CategoryFilterConfig" ADD CONSTRAINT "CategoryFilterConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cla"."CategoryFilterConfig" ADD CONSTRAINT "CategoryFilterConfig_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "cla"."Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
