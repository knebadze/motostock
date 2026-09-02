import sharp from "sharp";
import { ApiError } from "./ApiError.js";
import { getImageMaxDimensionPx, getImageWebpQuality } from "../modules/settings/settings.service.js";

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

  const maxDimension = await getImageMaxDimensionPx();

  // Animated GIFs would lose their animation through a naive webp
  // re-encode, so they get their own branch instead of falling into the
  // shared pipeline below — but they still go through it, unlike before.
  // The format sniff above only reads enough of the file to identify it as
  // a GIF; passing the original bytes straight to disk after that meant
  // anything else the file contained past what metadata() bothered to
  // parse — malformed structures, polyglot payloads — went unvalidated
  // straight into public storage. Reading with `animated: true` decodes
  // every frame instead of just the first; re-encoding via .gif() forces
  // the output through libvips' own writer, which can only reproduce
  // genuinely-decoded GIF pixel data, the same sanitization guarantee the
  // webp branch below already gets.
  if (format === "gif") {
    const reencoded = await sharp(buffer, { animated: true })
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .gif()
      .toBuffer();
    return { buffer: reencoded, extension: ".gif" };
  }

  const webpQuality = await getImageWebpQuality();
  const processed = await sharp(buffer)
    .rotate() // respect EXIF orientation before resizing, or phone photos come out sideways
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality: webpQuality })
    .toBuffer();

  return { buffer: processed, extension: ".webp" };
}
