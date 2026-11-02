-- Shop filter on/off switch (deactivate instead of delete).
ALTER TABLE "cla"."CategoryFilterConfig" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
