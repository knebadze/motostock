-- AlterTable
ALTER TABLE "dbo"."Product" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "metaDescription" TEXT;

-- Backfill: guaranteed-unique placeholder slug for any pre-existing rows —
-- admins can set a real one afterward via the new SEO tab.
UPDATE "dbo"."Product" SET "slug" = 'product-' || "id"::text WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "dbo"."Product" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "dbo"."Product"("slug");
