-- Fixes a check-then-create race in category-filters.service.ts's
-- createCategoryFilter and vehicle-category-filters.service.ts's
-- createVehicleCategoryFilter: each does a check-then-create (findByCategory
-- AndAttribute/findByCategoryAndType, or the SPEC/type equivalent) with no
-- DB constraint backing it. The row's own withNextSortOrderLock advisory
-- lock only serializes sortOrder computation, not this duplicate check, so
-- a double-click "add filter" (or two admins) could both pass the check
-- before either commits, producing two rows for the same category+
-- attribute/specField (or the same category+built-in filter type), which
-- the storefront then renders as a duplicated filter widget. Two different
-- uniqueness keys depending on filterType — same per-branch-type pattern as
-- ProductFitmentRule (migration 20260908110000) — so this is migration-SQL-
-- only; Prisma's schema DSL has no partial/filtered unique index syntax.
--
-- Any pre-existing duplicates are removed first, keeping the lowest-id row
-- per group, so the CREATE UNIQUE INDEX statements below don't fail.

-- CategoryFilterConfig: dedupe ATTRIBUTE-type rows by (categoryId, attributeId).
DELETE FROM "cla"."CategoryFilterConfig" c
USING (
  SELECT "id", MIN("id") OVER (PARTITION BY "categoryId", "attributeId") AS "keepId"
  FROM "cla"."CategoryFilterConfig"
  WHERE "filterType" = 'ATTRIBUTE'
) d
WHERE c."id" = d."id" AND d."id" <> d."keepId";

-- CategoryFilterConfig: dedupe the built-in types (PRICE/BRAND/MY_VEHICLE)
-- by (categoryId, filterType).
DELETE FROM "cla"."CategoryFilterConfig" c
USING (
  SELECT "id", MIN("id") OVER (PARTITION BY "categoryId", "filterType") AS "keepId"
  FROM "cla"."CategoryFilterConfig"
  WHERE "filterType" <> 'ATTRIBUTE'
) d
WHERE c."id" = d."id" AND d."id" <> d."keepId";

-- At most one ATTRIBUTE-type row per (category, attribute).
CREATE UNIQUE INDEX "CategoryFilterConfig_attribute_key"
  ON "cla"."CategoryFilterConfig" ("categoryId", "attributeId")
  WHERE "filterType" = 'ATTRIBUTE';

-- At most one row per (category, built-in filter type) among the rest.
CREATE UNIQUE INDEX "CategoryFilterConfig_type_key"
  ON "cla"."CategoryFilterConfig" ("categoryId", "filterType")
  WHERE "filterType" <> 'ATTRIBUTE';

-- VehicleCategoryFilterConfig: dedupe SPEC-type rows by (categoryId, specField).
DELETE FROM "cla"."VehicleCategoryFilterConfig" c
USING (
  SELECT "id", MIN("id") OVER (PARTITION BY "categoryId", "specField") AS "keepId"
  FROM "cla"."VehicleCategoryFilterConfig"
  WHERE "filterType" = 'SPEC'
) d
WHERE c."id" = d."id" AND d."id" <> d."keepId";

-- VehicleCategoryFilterConfig: dedupe the built-in types (PRICE/YEAR/BRAND)
-- by (categoryId, filterType).
DELETE FROM "cla"."VehicleCategoryFilterConfig" c
USING (
  SELECT "id", MIN("id") OVER (PARTITION BY "categoryId", "filterType") AS "keepId"
  FROM "cla"."VehicleCategoryFilterConfig"
  WHERE "filterType" <> 'SPEC'
) d
WHERE c."id" = d."id" AND d."id" <> d."keepId";

CREATE UNIQUE INDEX "VehicleCategoryFilterConfig_spec_key"
  ON "cla"."VehicleCategoryFilterConfig" ("categoryId", "specField")
  WHERE "filterType" = 'SPEC';

CREATE UNIQUE INDEX "VehicleCategoryFilterConfig_type_key"
  ON "cla"."VehicleCategoryFilterConfig" ("categoryId", "filterType")
  WHERE "filterType" <> 'SPEC';
