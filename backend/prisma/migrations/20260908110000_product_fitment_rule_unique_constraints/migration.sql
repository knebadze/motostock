-- ProductFitmentRule has no DB-level uniqueness at all today — only the
-- service-layer pre-checks (findByProductAndCategory/findByProductAndSpec/
-- findByProductAndAllType) stand between two near-simultaneous "add rule"
-- requests and a genuine duplicate row, with nothing at the DB to catch the
-- race. Each rule type has a different uniqueness key, and all three
-- coexist in one table with mostly-nullable columns, so a single plain
-- @@unique can't express this — Prisma's schema DSL has no partial/filtered
-- unique index syntax, so this is migration-SQL-only (same reasoning as the
-- owner-XOR CHECK constraints in migration 20260818093000).

-- At most one CATEGORY-type rule per (product, category).
CREATE UNIQUE INDEX "ProductFitmentRule_category_key"
  ON "dbo"."ProductFitmentRule" ("productId", "categoryId")
  WHERE "type" = 'CATEGORY';

-- At most one SPEC-type rule per (product, specField, specLookupItemId).
CREATE UNIQUE INDEX "ProductFitmentRule_spec_key"
  ON "dbo"."ProductFitmentRule" ("productId", "specField", "specLookupItemId")
  WHERE "type" = 'SPEC';

-- At most one ALL-type rule per product.
CREATE UNIQUE INDEX "ProductFitmentRule_all_key"
  ON "dbo"."ProductFitmentRule" ("productId")
  WHERE "type" = 'ALL';
