-- Engine oil capacity (litres) per vehicle catalog entry — how much oil
-- the engine takes at a change. Optional, like the other spec fields.
ALTER TABLE "cla"."VehicleCatalog" ADD COLUMN "oilCapacityLiters" DECIMAL(4,2);

-- Lets admins add it as a vehicle category filter (NUMBER range), like the
-- other numeric spec fields.
ALTER TYPE "cla"."VehicleSpecField" ADD VALUE 'OIL_CAPACITY_LITERS';
