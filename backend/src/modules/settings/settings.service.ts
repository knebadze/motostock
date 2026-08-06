import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { isVincarioConfigured } from "../vin-decode/vin-decode.providers.js";
import { settingsRepository } from "./settings.repository.js";
import type { UpdateSettingsInput, VinDecodeProvider } from "./settings.schema.js";

export const USE_CLOUD_STORAGE_KEY = "use_cloud_storage";
export const VIN_DECODE_ENABLED_KEY = "vin_decode_enabled";
export const VIN_DECODE_PROVIDER_KEY = "vin_decode_provider";
export const GUEST_WISHLIST_ENABLED_KEY = "guest_wishlist_enabled";
export const GUEST_CART_ENABLED_KEY = "guest_cart_enabled";

function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
}

export async function isCloudStorageEnabled(): Promise<boolean> {
  const setting = await settingsRepository.findByKey(USE_CLOUD_STORAGE_KEY);
  return setting?.value === "true";
}

export async function isVinDecodeEnabled(): Promise<boolean> {
  const setting = await settingsRepository.findByKey(VIN_DECODE_ENABLED_KEY);
  return setting?.value === "true";
}

export async function getVinDecodeProvider(): Promise<VinDecodeProvider> {
  const setting = await settingsRepository.findByKey(VIN_DECODE_PROVIDER_KEY);
  return setting?.value === "vincario" ? "vincario" : "nhtsa";
}

export async function isGuestWishlistEnabled(): Promise<boolean> {
  const setting = await settingsRepository.findByKey(GUEST_WISHLIST_ENABLED_KEY);
  return setting?.value === "true";
}

export async function isGuestCartEnabled(): Promise<boolean> {
  const setting = await settingsRepository.findByKey(GUEST_CART_ENABLED_KEY);
  return setting?.value === "true";
}

export async function getSettings() {
  return {
    useCloudStorage: await isCloudStorageEnabled(),
    vinDecodeEnabled: await isVinDecodeEnabled(),
    vinDecodeProvider: await getVinDecodeProvider(),
    guestWishlistEnabled: await isGuestWishlistEnabled(),
    guestCartEnabled: await isGuestCartEnabled(),
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
  return getSettings();
}
