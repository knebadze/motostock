-- Percent discounts are now kept in step with the list price (see
-- lib/discounts.ts recomputePercentDiscounts). Rows created before that
-- still carry the price computed against the list price at creation time —
-- re-derive every not-yet-ended percent discount from the current price.
-- Ended discounts are history and are left as they were.

UPDATE "dbo"."ProductVariantDiscount" d
SET "discountPrice" = ROUND(v."price" * (1 - d."discountPercent" / 100), 2),
    "updatedAt" = NOW()
FROM "dbo"."ProductVariant" v
WHERE d."productVariantId" = v."id"
  AND d."discountPercent" IS NOT NULL
  AND d."endDate" >= NOW();

UPDATE "dbo"."VehicleListingDiscount" d
SET "discountPrice" = ROUND(l."price" * (1 - d."discountPercent" / 100), 2),
    "updatedAt" = NOW()
FROM "dbo"."VehicleListing" l
WHERE d."vehicleListingId" = l."id"
  AND d."discountPercent" IS NOT NULL
  AND d."endDate" >= NOW();
