-- Per-category "can be bought online" switch (e.g. vehicles: visit the
-- showroom instead of adding to cart). Applies to the category and every
-- category under it. Defaults to true, so existing categories are unchanged.
ALTER TABLE "cla"."Category" ADD COLUMN "onlinePurchaseEnabled" BOOLEAN NOT NULL DEFAULT true;
