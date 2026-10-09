import type { Request, Response } from "express";
import { renderShareImage } from "./share-image.service.js";
import type { ShareImageQuery } from "./share-image.schema.js";

export async function getShareImage(req: Request<unknown, unknown, unknown, ShareImageQuery>, res: Response) {
  const buffer = await renderShareImage(req.query.src);
  res.setHeader("Content-Type", "image/jpeg");
  // Crawlers cache previews themselves; a day here keeps repeat fetches cheap.
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(buffer);
}
