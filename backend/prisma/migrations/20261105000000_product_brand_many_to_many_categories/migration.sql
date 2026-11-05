-- ProductBrand used to have a single required categoryId: a brand (e.g.
-- Alpinestars) sells into several unrelated category branches at once
-- (gloves, jackets, helmets, boots), which one FK per brand can't represent.
-- Replace it with a join table; existing categoryId values are carried over
-- as this brand's first category link before the column is dropped, so no
-- brand loses its current category.

CREATE TABLE "cla"."ProductBrandCategory" (
    "productBrandId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBrandCategory_pkey" PRIMARY KEY ("productBrandId", "categoryId")
);

CREATE INDEX "ProductBrandCategory_categoryId_idx" ON "cla"."ProductBrandCategory"("categoryId");

ALTER TABLE "cla"."ProductBrandCategory" ADD CONSTRAINT "ProductBrandCategory_productBrandId_fkey"
  FOREIGN KEY ("productBrandId") REFERENCES "cla"."ProductBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cla"."ProductBrandCategory" ADD CONSTRAINT "ProductBrandCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "cla"."ProductBrandCategory" ("productBrandId", "categoryId")
SELECT "id", "categoryId" FROM "cla"."ProductBrand";

ALTER TABLE "cla"."ProductBrand" DROP CONSTRAINT "ProductBrand_categoryId_fkey";
DROP INDEX "cla"."ProductBrand_categoryId_idx";
ALTER TABLE "cla"."ProductBrand" DROP COLUMN "categoryId";
