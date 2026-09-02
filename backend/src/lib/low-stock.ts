// Shared by the admin dashboard's low-stock table and the storefront's
// "only N left" urgency badge (see products.service.ts) — kept in one place
// so the two surfaces never drift out of sync on what counts as "low". The
// threshold itself is admin-configurable (see settings.service.ts's
// getLowStockThreshold), so this is now async.
import { getLowStockThreshold } from "../modules/settings/settings.service.js";

// Returns the quantity to show in an urgency badge, or null if the badge
// shouldn't render (badge disabled for the category, out of stock, or
// stock is above the threshold).
export async function computeLowStockQuantity(
  quantity: number,
  badgeEnabled: boolean,
): Promise<number | null> {
  if (!badgeEnabled || quantity <= 0) return null;
  const threshold = await getLowStockThreshold();
  return quantity <= threshold ? quantity : null;
}
