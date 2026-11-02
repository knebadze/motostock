-- "scooters" are electric stand-up scooters: the seeded fuel-type filter
-- belonged to mopeds (prisma/seed.ts now gives mopeds their own set).
DELETE FROM "cla"."VehicleCategoryFilterConfig"
WHERE "specField" = 'FUEL_TYPE'
  AND "categoryId" IN (SELECT "id" FROM "cla"."Category" WHERE "slug" = 'scooters');
