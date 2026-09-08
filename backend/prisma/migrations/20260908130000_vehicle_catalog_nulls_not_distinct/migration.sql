-- The existing unique index on (modelId, variant, yearFrom, yearTo)
-- (migration 20260727080000) uses Postgres's default NULLS DISTINCT
-- semantics, under which two NULLs are never considered equal. yearFrom/
-- yearTo are genuinely nullable ("still in production" -> yearTo: null,
-- "unknown start year" -> yearFrom: null), so two concurrent submissions of
-- the identical model+variant with either year null were never actually
-- blocked by this constraint at the DB level — only the service layer's
-- racy pre-check (assertNoDuplicate) stood in the way. Recreating it with
-- NULLS NOT DISTINCT (Postgres 15+) closes that gap the same way this
-- project already closed NULL-aware-uniqueness gaps elsewhere (the
-- owner-XOR CHECK constraints, ProductFitmentRule's partial indexes) —
-- Prisma's schema DSL has no NULLS NOT DISTINCT syntax, so this is
-- migration-SQL-only; the @@unique was removed from vehicle-catalog.prisma.
DROP INDEX "dbo"."VehicleCatalog_modelId_variant_yearFrom_yearTo_key";

CREATE UNIQUE INDEX "VehicleCatalog_modelId_variant_yearFrom_yearTo_key"
  ON "dbo"."VehicleCatalog" ("modelId", "variant", "yearFrom", "yearTo")
  NULLS NOT DISTINCT;
