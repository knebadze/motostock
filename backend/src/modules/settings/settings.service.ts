import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { settingsRepository } from "./settings.repository.js";
import type { UpdateSettingsInput } from "./settings.schema.js";

export const USE_CLOUD_STORAGE_KEY = "use_cloud_storage";

function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
}

export async function isCloudStorageEnabled(): Promise<boolean> {
  const setting = await settingsRepository.findByKey(USE_CLOUD_STORAGE_KEY);
  return setting?.value === "true";
}

export async function getSettings() {
  return { useCloudStorage: await isCloudStorageEnabled() };
}

export async function updateSettings(input: UpdateSettingsInput) {
  if (input.useCloudStorage && !isCloudinaryConfigured()) {
    throw new ApiError(
      400,
      "ღრუბლოვანი შენახვის ჩართვამდე დააკონფიგურირეთ Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) სერვერის გარემოს ცვლადებში",
    );
  }

  await settingsRepository.upsert(USE_CLOUD_STORAGE_KEY, String(input.useCloudStorage));
  return getSettings();
}
