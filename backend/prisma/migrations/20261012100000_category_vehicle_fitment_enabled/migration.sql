-- Per-category "products here depend on the vehicle" switch: on for parts/
-- oils (fitment editing, compatibility checks), off for e.g. helmets.
-- Applies to the category and every category under it. Defaults to true, so
-- existing categories are unchanged.
ALTER TABLE "cla"."Category" ADD COLUMN "vehicleFitmentEnabled" BOOLEAN NOT NULL DEFAULT true;
