// Site-wide feature toggles — mirrors the admin UI's GeneralSettingsTab.tsx
// grouping. No shared *_DEFAULTS object here (unlike most of the other
// constants files): every one of these is a plain boolean (defaults to
// false) or the "nhtsa" VIN provider fallback, both inlined at their own
// getter in settings.service.ts rather than pulled from a shared object.
export const USE_CLOUD_STORAGE_KEY = "use_cloud_storage";
export const VIN_DECODE_ENABLED_KEY = "vin_decode_enabled";
export const VIN_DECODE_PROVIDER_KEY = "vin_decode_provider";
export const GUEST_WISHLIST_ENABLED_KEY = "guest_wishlist_enabled";
export const GUEST_CART_ENABLED_KEY = "guest_cart_enabled";
export const PROMO_STACKING_ENABLED_KEY = "promo_stacking_enabled";

export const GENERAL_SETTING_KEYS = [
  USE_CLOUD_STORAGE_KEY,
  VIN_DECODE_ENABLED_KEY,
  VIN_DECODE_PROVIDER_KEY,
  GUEST_WISHLIST_ENABLED_KEY,
  GUEST_CART_ENABLED_KEY,
  PROMO_STACKING_ENABLED_KEY,
];
