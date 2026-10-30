// Mirrors the admin UI's DeliverySettingsTab.tsx grouping. No shared
// *_DEFAULTS object — prices default to 0 and time-estimate strings default
// to "" at their own getter in settings.service.ts, same as general.constants.ts.
export const DELIVERY_TBILISI_PRICE_KEY = "delivery_tbilisi_price";
export const DELIVERY_TBILISI_TIME_KEY = "delivery_tbilisi_time";
export const DELIVERY_REGIONS_PRICE_KEY = "delivery_regions_price";
export const DELIVERY_REGIONS_TIME_KEY = "delivery_regions_time";
export const DELIVERY_EXPRESS_PRICE_KEY = "delivery_express_price";
export const DELIVERY_EXPRESS_TIME_KEY = "delivery_express_time";
// Days a customer has to return an item — shown on the product page and
// cart (0 hides the line). Defaults to 14 (the usual distance-sale window).
export const RETURN_PERIOD_DAYS_KEY = "return_period_days";
export const RETURN_PERIOD_DAYS_DEFAULT = 14;

// Checkout methods the admin can switch off (e.g. paying the courier causes
// trouble). Unset = on. At least one delivery+payment combination must stay
// available — enforced in settings.service.ts's updateSettings.
export const CHECKOUT_COURIER_ENABLED_KEY = "checkout_courier_enabled";
export const CHECKOUT_PICKUP_ENABLED_KEY = "checkout_pickup_enabled";
export const PAYMENT_CARD_ENABLED_KEY = "payment_card_enabled";
export const PAYMENT_ON_DELIVERY_ENABLED_KEY = "payment_on_delivery_enabled";
export const PAYMENT_IN_STORE_ENABLED_KEY = "payment_in_store_enabled";

export const DELIVERY_SETTING_KEYS = [
  DELIVERY_TBILISI_PRICE_KEY,
  DELIVERY_TBILISI_TIME_KEY,
  DELIVERY_REGIONS_PRICE_KEY,
  DELIVERY_REGIONS_TIME_KEY,
  DELIVERY_EXPRESS_PRICE_KEY,
  DELIVERY_EXPRESS_TIME_KEY,
  RETURN_PERIOD_DAYS_KEY,
  CHECKOUT_COURIER_ENABLED_KEY,
  CHECKOUT_PICKUP_ENABLED_KEY,
  PAYMENT_CARD_ENABLED_KEY,
  PAYMENT_ON_DELIVERY_ENABLED_KEY,
  PAYMENT_IN_STORE_ENABLED_KEY,
];
