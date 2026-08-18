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
