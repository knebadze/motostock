-- ProductBrand names (Alpinestars, Michelin, AGV, etc.) are not per-locale
-- translated either — every existing row already had byte-identical
-- nameKa/nameEn/nameRu values. Collapse to one `name`, same pattern as the
-- earlier Brand/Model simplification.
ALTER TABLE "cla"."ProductBrand" DROP COLUMN "nameKa";
ALTER TABLE "cla"."ProductBrand" DROP COLUMN "nameRu";
ALTER TABLE "cla"."ProductBrand" RENAME COLUMN "nameEn" TO "name";
