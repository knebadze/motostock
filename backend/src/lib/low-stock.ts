// Shared by the admin dashboard's low-stock table and the storefront's
// "only N left" urgency badge (see products.service.ts) — kept in one place
// so the two surfaces never drift out of sync on what counts as "low".
export const LOW_STOCK_THRESHOLD = 3;

// Returns the quantity to show in an urgency badge, or null if the badge
// shouldn't render (badge disabled for the category, out of stock, or
// stock is above the threshold).
export function computeLowStockQuantity(quantity: number, badgeEnabled: boolean): number | null {
  return badgeEnabled && quantity > 0 && quantity <= LOW_STOCK_THRESHOLD ? quantity : null;
}
