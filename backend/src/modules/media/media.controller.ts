import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { toAbsoluteUrl } from "../../lib/public-url.js";

// Not tied to any entity id (unlike e.g. vehicle-catalog.controller.ts's
// uploadImage) — the RichTextEditor may be composing content for a row that
// doesn't exist yet (a new newsletter campaign draft), so the image just
// needs a stable, immediately-usable URL, independent of what it ends up
// embedded in.
export async function uploadRichTextImage(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის მიბმული");
  }

  const url = await saveUploadedImage("rich-text", req.file);
  const origin = env.BACKEND_PUBLIC_URL ?? `${req.protocol}://${req.get("host")}`;
  res.status(200).json({ url: toAbsoluteUrl(url, origin) });
}
