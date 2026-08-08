// Persists the shopper's "my vehicle" shop-filter pick across navigation
// (a plain, non-httpOnly cookie — read server-side on the category and
// product-detail pages so buyTogether companions can be narrowed to ones
// compatible with it) instead of the client-only React state it used to be
// stuck in. Not an identity cookie, so a shorter, renewable TTL than the
// guest-id one is fine.
export const SELECTED_VEHICLE_COOKIE = "motostock_selected_vehicle_id";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function persistSelectedVehicleCookie(vehicleCatalogId: string) {
  if (typeof document === "undefined") return;
  document.cookie = vehicleCatalogId
    ? `${SELECTED_VEHICLE_COOKIE}=${vehicleCatalogId}; path=/; max-age=${MAX_AGE_SECONDS}`
    : `${SELECTED_VEHICLE_COOKIE}=; path=/; max-age=0`;
}
