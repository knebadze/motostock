// Shared "is this discount currently active" check — a discount is active
// exactly when `now` falls within [startDate, endDate] inclusive. Both
// ProductVariantDiscount and VehicleListingDiscount rows satisfy this shape
// structurally, so one generic works for both without either module
// depending on the other's types. Previously reimplemented independently in
// 7 services (cart, orders, products, product-variants, vehicle-listing,
// bulk-product-discounts, bulk-vehicle-listing-discounts) — consolidated
// here so the window comparison can't drift between call sites.
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
