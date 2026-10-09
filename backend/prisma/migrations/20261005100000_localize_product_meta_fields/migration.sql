-- Product SEO meta was a single (Georgian-only) value served on all three
-- locales. Existing values were always authored in Georgian (auto-filled
-- from nameKa/descriptionKa), so they become the Ka columns; En/Ru start
-- empty and fall back to the localized name/description until filled in.
ALTER TABLE "dbo"."Product" RENAME COLUMN "metaTitle" TO "metaTitleKa";
ALTER TABLE "dbo"."Product" RENAME COLUMN "metaDescription" TO "metaDescriptionKa";
ALTER TABLE "dbo"."Product" ADD COLUMN "metaTitleEn" TEXT,
ADD COLUMN "metaTitleRu" TEXT,
ADD COLUMN "metaDescriptionEn" TEXT,
ADD COLUMN "metaDescriptionRu" TEXT;
