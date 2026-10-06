import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ApiError } from "../../lib/ApiError.js";
import { UPLOAD_ROOT } from "../../lib/storage.js";

// Link-preview ("share") images for chat apps and social networks
// (Messenger, WhatsApp, Telegram, Viber, Facebook...): the frontend's
// og:image points here instead of at the raw upload. Uploads are stored as
// WebP (lib/image-processing.ts), which several messengers — WhatsApp most
// notably — don't render in previews, and at arbitrary aspect ratios, which
// they crop or shrink to a thumbnail. This serves a 1200×630 JPEG (the
// standard preview size), the whole image letterboxed on white so a product
// photo is never cropped.
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;

const ALLOWED_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png", ".gif"]);

// Small in-memory cache — crawlers re-fetch the same handful of popular
// pages; keyed by path + mtime so a replaced file is never served stale.
const MAX_CACHED = 100;
const cache = new Map<string, Buffer>();

// Only local uploads (/uploads/...) — resolved and confined to the upload
// root with the same separator-exact check storage.ts's delete uses, so a
// crafted `src` can never read anything outside it. Cloud-stored images are
// transformed by Cloudinary's own URL API on the frontend instead.
function resolveUploadPath(src: string): string {
  if (!src.startsWith("/uploads/")) throw new ApiError(400, "Invalid image path");
  const filePath = path.resolve(src.slice(1));
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) throw new ApiError(400, "Invalid image path");
  if (!ALLOWED_EXTENSIONS.has(path.extname(filePath).toLowerCase())) throw new ApiError(400, "Invalid image path");
  return filePath;
}

export async function renderShareImage(src: string): Promise<Buffer> {
  const filePath = resolveUploadPath(src);

  let mtimeMs: number;
  try {
    mtimeMs = (await fs.stat(filePath)).mtimeMs;
  } catch {
    throw new ApiError(404, "Image not found");
  }

  const key = `${filePath}:${mtimeMs}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const buffer = await sharp(filePath, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize(SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
  cache.set(key, buffer);
  return buffer;
}
