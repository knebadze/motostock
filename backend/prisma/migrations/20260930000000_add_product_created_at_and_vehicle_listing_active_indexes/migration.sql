-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "dbo"."Product"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleListing_isActive_createdAt_idx" ON "dbo"."VehicleListing"("isActive", "createdAt");
