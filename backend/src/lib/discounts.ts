// Shared "is this discount currently active" check — a discount is active
// exactly when `now` falls within [startDate, endDate] inclusive. Both
// ProductVariantDiscount and VehicleListingDiscount rows satisfy this shape
// structurally, so one generic works for both without either module
// depending on the other's types. Previously reimplemented independently in
// 7 services (cart, orders, products, product-variants, vehicle-listing,
// bulk-discounts x2) — consolidated here so the window comparison can't
// drift between call sites.
export function findActiveDiscount<T extends { startDate: Date; endDate: Date }>(
  discounts: T[],
): T | null {
  const now = new Date();
  return discounts.find((discount) => discount.startDate <= now && now <= discount.endDate) ?? null;
}

// Used when guarding a price decrease on the item itself: a SCHEDULED
// (not-yet-started) discount is invisible to findActiveDiscount, so a price
// guard built on that alone can let the list price drop below a discount
// that hasn't started yet — the discount then activates on schedule priced
// *above* the item's real current price, an overcharge with nothing left to
// catch it. This checks every discount that hasn't ended yet (active or
// scheduled), not just the currently-active one.
export function findDiscountAtOrAbovePrice<
  T extends { endDate: Date; discountPrice: { toString(): string } },
>(discounts: T[], price: number): T | null {
  const now = new Date();
  return (
    discounts.find((discount) => discount.endDate >= now && Number(discount.discountPrice) >= price) ?? null
  );
}

// Two kinds of discount rows share one table: FIXED (discountPercent null —
// discountPrice is exactly what the admin typed) and PERCENT (discountPercent
// set — discountPrice is derived from the item's current list price). A
// PERCENT row's discountPrice is still stored (every reader, including the
// raw-SQL price sort/filter, keeps using it) but is never taken from the
// client and is recomputed whenever the list price changes, so "-10%" stays
// 10% instead of freezing at the price it was created against.
export function applyPercentDiscount(price: number, percent: number): number {
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

type DiscountRecomputeTx = { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number> };

// Re-derives every not-yet-ended PERCENT discount of one variant/listing
// from its current price. Ended rows are history and stay as they were.
// ROUND(..., 2) matches applyPercentDiscount's rounding.
export async function recomputePercentDiscounts(
  tx: DiscountRecomputeTx,
  owner: "PRODUCT_VARIANT" | "VEHICLE_LISTING",
  ownerId: number,
): Promise<void> {
  if (owner === "PRODUCT_VARIANT") {
    await tx.$executeRaw`
      UPDATE "dbo"."ProductVariantDiscount" d
      SET "discountPrice" = ROUND(v."price" * (1 - d."discountPercent" / 100), 2), "updatedAt" = NOW()
      FROM "dbo"."ProductVariant" v
      WHERE d."productVariantId" = v."id" AND v."id" = ${ownerId}
        AND d."discountPercent" IS NOT NULL AND d."endDate" >= NOW()
    `;
  } else {
    await tx.$executeRaw`
      UPDATE "dbo"."VehicleListingDiscount" d
      SET "discountPrice" = ROUND(l."price" * (1 - d."discountPercent" / 100), 2), "updatedAt" = NOW()
      FROM "dbo"."VehicleListing" l
      WHERE d."vehicleListingId" = l."id" AND l."id" = ${ownerId}
        AND d."discountPercent" IS NOT NULL AND d."endDate" >= NOW()
    `;
  }
}
