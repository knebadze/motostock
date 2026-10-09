import sharp, { type Metadata } from "sharp";
import { ApiError } from "./ApiError.js";
import { getImageMaxDimensionPx, getImageWebpQuality } from "../modules/settings/settings.service.js";

// Multer's fileFilter only checks the client-supplied Content-Type header,
// which is trivial to spoof — the real validation happens here, via
// libvips' own format sniffing of the actual file bytes.
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

// Decompression-bomb guard. The 5 MB upload cap bounds the *compressed*
// size only — a small PNG can decode to gigabytes of RGBA, and sharp's
// default ceiling (~268M px ≈ 1 GB decoded) is enough to OOM the container.
// 60M px still fits a 48 MP phone photo (8000×6000) with headroom. For an
// animated GIF, libvips counts every frame (width × height × pages), so
// this also caps frame-count bombs.
const MAX_INPUT_PIXELS = 60_000_000;

// The actual bytes-are-really-an-image check, factored out so
// storage.ts's cloud-upload path can run it too — it previously skipped
// straight to Cloudinary with only Multer's spoofable Content-Type header
// as a gate, while the disk path got this real libvips-backed check for
// free by going through processImageForDisk. Returns the sniffed format so
// processImageForDisk below doesn't redundantly re-sniff it.
export async function sniffImageFormat(buffer: Buffer): Promise<string> {
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new ApiError(400, "ფაილი არ არის ვალიდური სურათი");
  }
  const { format, width = 0, height = 0, pages = 1 } = metadata;
  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw new ApiError(400, "ფაილი არ არის ვალიდური სურათი");
  }
  // Header-only read (no decode yet), so an oversized image is turned away
  // with a clean 400 here instead of as a 500 from limitInputPixels below.
  if (width * height * pages > MAX_INPUT_PIXELS) {
    throw new ApiError(400, "სურათის გაფართოება ძალიან დიდია");
  }
  return format;
}

export async function processImageForDisk(
  buffer: Buffer,
): Promise<{ buffer: Buffer; extension: string }> {
  const format = await sniffImageFormat(buffer);

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
    const reencoded = await sharp(buffer, { animated: true, limitInputPixels: MAX_INPUT_PIXELS })
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .gif()
      .toBuffer();
    return { buffer: reencoded, extension: ".gif" };
  }

  const webpQuality = await getImageWebpQuality();
  const processed = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate() // respect EXIF orientation before resizing, or phone photos come out sideways
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality: webpQuality })
    .toBuffer();

  return { buffer: processed, extension: ".webp" };
}
