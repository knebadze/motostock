import fs from "node:fs";
import path from "node:path";
import { isCloudStorageEnabled } from "../modules/settings/settings.service.js";
import { destroyCloudinaryAsset, uploadBufferToCloudinary } from "./cloudinary.js";
import { processImageForDisk, sniffImageFormat } from "./image-processing.js";
import { logger } from "./logger.js";

const UPLOAD_ROOT = path.resolve("uploads");

async function saveToDisk(subfolder: string, file: Express.Multer.File): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });

  const { buffer, extension } = await processImageForDisk(file.buffer);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  fs.writeFileSync(path.join(dir, filename), buffer);

  return `/uploads/${subfolder}/${filename}`;
}

export async function saveUploadedImage(
  subfolder: string,
  file: Express.Multer.File,
): Promise<string> {
  if (await isCloudStorageEnabled()) {
    // saveToDisk gets this check for free via processImageForDisk — the
    // cloud path needs it explicitly, or a non-image (or disallowed
    // format) file sails past Multer's spoofable Content-Type check
    // straight to Cloudinary. Cloudinary's own transformation (see
    // cloudinary.ts) still handles resize/format normalization, so the
    // original buffer is uploaded as-is once it's confirmed genuine.
    await sniffImageFormat(file.buffer);
    return uploadBufferToCloudinary(file.buffer, subfolder);
  }
  return saveToDisk(subfolder, file);
}

// Cloudinary's secure_url shape (see cloudinary.ts's uploadBufferToCloudinary)
// is https://res.cloudinary.com/<cloud>/image/upload/v<version>/<public_id>.<ext>
// — destroy() needs the public_id (the folder path + generated id, no
// extension, no version segment), which only exists embedded in the URL
// string itself since nothing stores it separately.
function extractCloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/);
  return match ? match[1] : null;
}

// Deletes whatever saveUploadedImage previously returned — the missing
// half of that function, which is why every "replace this image" call site
// across the admin panel (products, categories, brands, banks, hero
// slides, ...) used to just overwrite the stored URL and leave the old
// file behind forever, on disk or in the Cloudinary account, accumulating
// as pure dead weight with no cleanup path at all.
//
// Dispatches by the URL's own shape (an absolute https:// URL vs. a
// relative /uploads/... path — same test as public-url.ts's
// toAbsoluteUrl), not by the *current* isCloudStorageEnabled() setting —
// an admin can toggle cloud storage on/off after older images were already
// saved under the other backend, so "where is this specific file" has to
// be read from the URL, not inferred from today's setting.
//
// Best-effort and never throws: called after the new image is already
// saved and the DB row already points at it, so a failure to clean up the
// old file must not fail the request the admin is waiting on — same
// "log and move on" tradeoff as auth.service.ts's issueVerificationEmail.
export async function deleteUploadedImage(url: string | null | undefined): Promise<void> {
  if (!url) return;

  try {
    if (/^https?:\/\//i.test(url)) {
      const publicId = extractCloudinaryPublicId(url);
      if (!publicId) return;
      await destroyCloudinaryAsset(publicId);
      return;
    }

    const relative = url.startsWith("/") ? url.slice(1) : url;
    const filePath = path.resolve(relative);
    // Refuses to delete anything outside the uploads directory — a
    // malformed or unexpected stored URL must never turn into a path
    // traversal off this project's own upload root.
    if (!filePath.startsWith(UPLOAD_ROOT)) return;
    fs.rmSync(filePath, { force: true });
  } catch (err) {
    logger.error({ err, url }, "Failed to delete a replaced/removed uploaded image");
  }
}
