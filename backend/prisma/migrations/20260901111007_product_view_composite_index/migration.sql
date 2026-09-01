-- DropIndex
DROP INDEX "dbo"."ProductView_productId_idx";

-- CreateIndex
CREATE INDEX "ProductView_productId_updatedAt_idx" ON "dbo"."ProductView"("productId", "updatedAt");
