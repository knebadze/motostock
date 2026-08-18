-- Storefront search (products.repository.ts, vehicle-listing.repository.ts)
-- filters with `ILIKE '%term%'` (leading wildcard) on these columns, which a
-- plain btree index can't accelerate at all — every search does a full
-- table scan today, and gets linearly slower as the catalog grows. pg_trgm's
-- trigram GIN indexes are Postgres's standard fix for this exact pattern.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Product_nameKa_idx" ON "dbo"."Product" USING GIN ("nameKa" gin_trgm_ops);
CREATE INDEX "Product_nameEn_idx" ON "dbo"."Product" USING GIN ("nameEn" gin_trgm_ops);
CREATE INDEX "Product_nameRu_idx" ON "dbo"."Product" USING GIN ("nameRu" gin_trgm_ops);

CREATE INDEX "Brand_name_idx" ON "cla"."Brand" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Model_name_idx" ON "cla"."Model" USING GIN ("name" gin_trgm_ops);
