-- Vehicle shop filter on/off switch (deactivate instead of delete).
ALTER TABLE "cla"."VehicleCategoryFilterConfig" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
