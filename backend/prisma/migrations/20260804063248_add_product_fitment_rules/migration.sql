-- CreateEnum
CREATE TYPE "dbo"."ProductFitmentRuleType" AS ENUM ('CATEGORY', 'SPEC', 'ALL');

-- CreateTable
CREATE TABLE "dbo"."ProductFitmentRule" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" "dbo"."ProductFitmentRuleType" NOT NULL,
    "categoryId" INTEGER,
    "specField" "cla"."VehicleSpecField",
    "specLookupItemId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFitmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductFitmentRule_productId_idx" ON "dbo"."ProductFitmentRule"("productId");

-- CreateIndex
CREATE INDEX "ProductFitmentRule_categoryId_idx" ON "dbo"."ProductFitmentRule"("categoryId");

-- AddForeignKey
ALTER TABLE "dbo"."ProductFitmentRule" ADD CONSTRAINT "ProductFitmentRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductFitmentRule" ADD CONSTRAINT "ProductFitmentRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
