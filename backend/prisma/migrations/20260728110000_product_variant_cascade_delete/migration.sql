-- DropForeignKey
ALTER TABLE "dbo"."ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- AddForeignKey
-- ProductVariant is an owned child of Product (like ProductFitment and
-- ProductAttributeValue, which already cascade) — it has no meaning without
-- its parent, unlike structural references such as Product.categoryId which
-- stay RESTRICT. This was an oversight from when the table was first added.
ALTER TABLE "dbo"."ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
