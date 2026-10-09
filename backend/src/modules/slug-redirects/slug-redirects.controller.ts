import type { Request, Response } from "express";
import type { SlugRedirectParams } from "./slug-redirects.schema.js";
import { resolveCategorySlug, resolveProductSlug } from "./slug-redirects.service.js";

export async function resolveProduct(req: Request<SlugRedirectParams>, res: Response) {
  res.status(200).json(await resolveProductSlug(req.params.slug));
}

export async function resolveCategory(req: Request<SlugRedirectParams>, res: Response) {
  res.status(200).json(await resolveCategorySlug(req.params.slug));
}
