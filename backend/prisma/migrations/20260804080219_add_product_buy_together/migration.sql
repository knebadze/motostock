-- CreateTable
CREATE TABLE "dbo"."ProductBuyTogether" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "relatedProductId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBuyTogether_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBuyTogether_relatedProductId_idx" ON "dbo"."ProductBuyTogether"("relatedProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBuyTogether_productId_relatedProductId_key" ON "dbo"."ProductBuyTogether"("productId", "relatedProductId");

-- AddForeignKey
ALTER TABLE "dbo"."ProductBuyTogether" ADD CONSTRAINT "ProductBuyTogether_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductBuyTogether" ADD CONSTRAINT "ProductBuyTogether_relatedProductId_fkey" FOREIGN KEY ("relatedProductId") REFERENCES "dbo"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
