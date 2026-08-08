import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { isVincarioConfigured } from "../vin-decode/vin-decode.providers.js";
import { settingsRepository } from "./settings.repository.js";
import type { UpdateSettingsInput, VinDecodeProvider } from "./settings.schema.js";

export const USE_CLOUD_STORAGE_KEY = "use_cloud_storage";
export const VIN_DECODE_ENABLED_KEY = "vin_decode_enabled";
export const VIN_DECODE_PROVIDER_KEY = "vin_decode_provider";
export const GUEST_WISHLIST_ENABLED_KEY = "guest_wishlist_enabled";
export const GUEST_CART_ENABLED_KEY = "guest_cart_enabled";
export const PROMO_STACKING_ENABLED_KEY = "promo_stacking_enabled";
export const DELIVERY_TBILISI_PRICE_KEY = "delivery_tbilisi_price";
export const DELIVERY_TBILISI_TIME_KEY = "delivery_tbilisi_time";
export const DELIVERY_REGIONS_PRICE_KEY = "delivery_regions_price";
export const DELIVERY_REGIONS_TIME_KEY = "delivery_regions_time";
export const DELIVERY_EXPRESS_PRICE_KEY = "delivery_express_price";
export const DELIVERY_EXPRESS_TIME_KEY = "delivery_express_time";

const ALL_SETTING_KEYS = [
  USE_CLOUD_STORAGE_KEY,
  VIN_DECODE_ENABLED_KEY,
  VIN_DECODE_PROVIDER_KEY,
  GUEST_WISHLIST_ENABLED_KEY,
  GUEST_CART_ENABLED_KEY,
  PROMO_STACKING_ENABLED_KEY,
  DELIVERY_TBILISI_PRICE_KEY,
  DELIVERY_TBILISI_TIME_KEY,
  DELIVERY_REGIONS_PRICE_KEY,
  DELIVERY_REGIONS_TIME_KEY,
  DELIVERY_EXPRESS_PRICE_KEY,
  DELIVERY_EXPRESS_TIME_KEY,
];

// Same read-through pattern as lookups.service.ts's listLookupItems, just
// generalized over the return type since settings getters parse to
// boolean/number/string rather than lookups' single array shape.
function cacheKey(settingKey: string) {
  return `settings:${settingKey}`;
}

async function cached<T>(settingKey: string, resolve: () => Promise<T>): Promise<T> {
  const key = cacheKey(settingKey);
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;

  const value = await resolve();
  cache.set(key, value);
  return value;
}

function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
}

export async function isCloudStorageEnabled(): Promise<boolean> {
  return cached(USE_CLOUD_STORAGE_KEY, async () => {
    const setting = await settingsRepository.findByKey(USE_CLOUD_STORAGE_KEY);
    return setting?.value === "true";
  });
}

export async function isVinDecodeEnabled(): Promise<boolean> {
  return cached(VIN_DECODE_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(VIN_DECODE_ENABLED_KEY);
    return setting?.value === "true";
  });
}

export async function getVinDecodeProvider(): Promise<VinDecodeProvider> {
  return cached(VIN_DECODE_PROVIDER_KEY, async () => {
    const setting = await settingsRepository.findByKey(VIN_DECODE_PROVIDER_KEY);
    return setting?.value === "vincario" ? "vincario" : "nhtsa";
  });
}

export async function isGuestWishlistEnabled(): Promise<boolean> {
  return cached(GUEST_WISHLIST_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(GUEST_WISHLIST_ENABLED_KEY);
    return setting?.value === "true";
  });
}

export async function isGuestCartEnabled(): Promise<boolean> {
  return cached(GUEST_CART_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(GUEST_CART_ENABLED_KEY);
    return setting?.value === "true";
  });
}

// Controls whether a checkout promo code stacks on top of an item that
// already has an active ProductVariantDiscount/VehicleListingDiscount, or
// is skipped for that item so the two discounts never combine — see
// orders.service.ts computeCheckoutTotals.
export async function isPromoStackingEnabled(): Promise<boolean> {
  return cached(PROMO_STACKING_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(PROMO_STACKING_ENABLED_KEY);
    return setting?.value === "true";
  });
}

export async function getDeliveryTbilisiPrice(): Promise<number> {
  return cached(DELIVERY_TBILISI_PRICE_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_TBILISI_PRICE_KEY);
    return Number(setting?.value ?? 0);
  });
}

export async function getDeliveryTbilisiTime(): Promise<string> {
  return cached(DELIVERY_TBILISI_TIME_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_TBILISI_TIME_KEY);
    return setting?.value ?? "";
  });
}

export async function getDeliveryRegionsPrice(): Promise<number> {
  return cached(DELIVERY_REGIONS_PRICE_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_REGIONS_PRICE_KEY);
    return Number(setting?.value ?? 0);
  });
}

export async function getDeliveryRegionsTime(): Promise<string> {
  return cached(DELIVERY_REGIONS_TIME_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_REGIONS_TIME_KEY);
    return setting?.value ?? "";
  });
}

export async function getDeliveryExpressPrice(): Promise<number> {
  return cached(DELIVERY_EXPRESS_PRICE_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_EXPRESS_PRICE_KEY);
    return Number(setting?.value ?? 0);
  });
}

export async function getDeliveryExpressTime(): Promise<string> {
  return cached(DELIVERY_EXPRESS_TIME_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_EXPRESS_TIME_KEY);
    return setting?.value ?? "";
  });
}

export async function getSettings() {
  return {
    useCloudStorage: await isCloudStorageEnabled(),
    vinDecodeEnabled: await isVinDecodeEnabled(),
    vinDecodeProvider: await getVinDecodeProvider(),
    guestWishlistEnabled: await isGuestWishlistEnabled(),
    guestCartEnabled: await isGuestCartEnabled(),
    promoStackingEnabled: await isPromoStackingEnabled(),
    deliveryTbilisiPrice: await getDeliveryTbilisiPrice(),
    deliveryTbilisiTime: await getDeliveryTbilisiTime(),
    deliveryRegionsPrice: await getDeliveryRegionsPrice(),
    deliveryRegionsTime: await getDeliveryRegionsTime(),
    deliveryExpressPrice: await getDeliveryExpressPrice(),
    deliveryExpressTime: await getDeliveryExpressTime(),
  };
}

// The only settings data exposed publicly — just enough for a guest-facing
// form to know whether to show the "fill via VIN" button. Everything else
// about Settings (including whether Cloudinary is on) stays admin-only.
export async function getVinDecodeStatus() {
  return {
    enabled: await isVinDecodeEnabled(),
    provider: await getVinDecodeProvider(),
  };
}

export async function updateSettings(input: UpdateSettingsInput) {
  if (input.useCloudStorage && !isCloudinaryConfigured()) {
    throw new ApiError(
      400,
      "ღრუბლოვანი შენახვის ჩართვამდე დააკონფიგურირეთ Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) სერვერის გარემოს ცვლადებში",
    );
  }

  if (input.vinDecodeEnabled && input.vinDecodeProvider === "vincario" && !isVincarioConfigured()) {
    throw new ApiError(
      400,
      "Vincario-ს ჩართვამდე დააკონფიგურირეთ VINCARIO_API_KEY და VINCARIO_SECRET_KEY სერვერის გარემოს ცვლადებში",
    );
  }

  await settingsRepository.upsert(USE_CLOUD_STORAGE_KEY, String(input.useCloudStorage));
  await settingsRepository.upsert(VIN_DECODE_ENABLED_KEY, String(input.vinDecodeEnabled));
  await settingsRepository.upsert(VIN_DECODE_PROVIDER_KEY, input.vinDecodeProvider);
  await settingsRepository.upsert(GUEST_WISHLIST_ENABLED_KEY, String(input.guestWishlistEnabled));
  await settingsRepository.upsert(GUEST_CART_ENABLED_KEY, String(input.guestCartEnabled));
  await settingsRepository.upsert(PROMO_STACKING_ENABLED_KEY, String(input.promoStackingEnabled));
  await settingsRepository.upsert(DELIVERY_TBILISI_PRICE_KEY, String(input.deliveryTbilisiPrice));
  await settingsRepository.upsert(DELIVERY_TBILISI_TIME_KEY, input.deliveryTbilisiTime);
  await settingsRepository.upsert(DELIVERY_REGIONS_PRICE_KEY, String(input.deliveryRegionsPrice));
  await settingsRepository.upsert(DELIVERY_REGIONS_TIME_KEY, input.deliveryRegionsTime);
  await settingsRepository.upsert(DELIVERY_EXPRESS_PRICE_KEY, String(input.deliveryExpressPrice));
  await settingsRepository.upsert(DELIVERY_EXPRESS_TIME_KEY, input.deliveryExpressTime);

  for (const key of ALL_SETTING_KEYS) cache.del(cacheKey(key));
  return getSettings();
}
