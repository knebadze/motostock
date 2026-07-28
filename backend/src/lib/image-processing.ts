import sharp from "sharp";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

export async function processImageForDisk(
  buffer: Buffer,
  mimetype: string,
): Promise<{ buffer: Buffer; extension: string }> {
  // Animated GIFs would lose their animation through a naive resize/webp
  // re-encode — out of scope for product photos, so pass them through as-is.
  if (mimetype === "image/gif") {
    return { buffer, extension: ".gif" };
  }

  const processed = await sharp(buffer)
    .rotate() // respect EXIF orientation before resizing, or phone photos come out sideways
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: processed, extension: ".webp" };
}
