import sharp from "sharp";
import { ApiError } from "./ApiError.js";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

// Multer's fileFilter only checks the client-supplied Content-Type header,
// which is trivial to spoof — the real validation happens here, via
// libvips' own format sniffing of the actual file bytes.
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export async function processImageForDisk(
  buffer: Buffer,
): Promise<{ buffer: Buffer; extension: string }> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(buffer).metadata());
  } catch {
    throw new ApiError(400, "ფაილი არ არის ვალიდური სურათი");
  }
  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw new ApiError(400, "ფაილი არ არის ვალიდური სურათი");
  }

  // Animated GIFs would lose their animation through a naive resize/webp
  // re-encode — out of scope for product photos, so pass them through as-is
  // (already verified as a genuine GIF above, not just GIF-labeled).
  if (format === "gif") {
    return { buffer, extension: ".gif" };
  }

  const processed = await sharp(buffer)
    .rotate() // respect EXIF orientation before resizing, or phone photos come out sideways
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: processed, extension: ".webp" };
}
