// Mirrors the admin UI's DeliverySettingsTab.tsx grouping. No shared
// *_DEFAULTS object — prices default to 0 and time-estimate strings default
// to "" at their own getter in settings.service.ts, same as general.constants.ts.
export const DELIVERY_TBILISI_PRICE_KEY = "delivery_tbilisi_price";
export const DELIVERY_TBILISI_TIME_KEY = "delivery_tbilisi_time";
export const DELIVERY_REGIONS_PRICE_KEY = "delivery_regions_price";
export const DELIVERY_REGIONS_TIME_KEY = "delivery_regions_time";
export const DELIVERY_EXPRESS_PRICE_KEY = "delivery_express_price";
export const DELIVERY_EXPRESS_TIME_KEY = "delivery_express_time";

export const DELIVERY_SETTING_KEYS = [
  DELIVERY_TBILISI_PRICE_KEY,
  DELIVERY_TBILISI_TIME_KEY,
  DELIVERY_REGIONS_PRICE_KEY,
  DELIVERY_REGIONS_TIME_KEY,
  DELIVERY_EXPRESS_PRICE_KEY,
  DELIVERY_EXPRESS_TIME_KEY,
];
