// Identical validation to product-variant-discounts.ts's schema (same
// discount-price/percent/date-range rules apply regardless of what's being
// discounted) — re-exported under this domain's own name instead of
// duplicating the schema, same "one shared schema, imported under each
// caller's own name" DRY-ing already done for bulk-discounts.ts.
export { productVariantDiscountFormSchema as vehicleListingDiscountFormSchema } from "./product-variant-discounts";
