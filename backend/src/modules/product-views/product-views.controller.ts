import type { Request, Response } from "express";
import * as productViewsService from "./product-views.service.js";
import { resolveProductViewOwner } from "./product-views.middleware.js";
import type { RecentlyViewedQuery } from "./product-views.schema.js";

export async function getRecentlyViewed(
  req: Request<unknown, unknown, unknown, RecentlyViewedQuery>,
  res: Response,
) {
  // Cast to the plain (unnarrowed) Request shape resolveProductViewOwner
  // expects — same req object at runtime, just a wider TS type than this
  // handler's query-schema-narrowed signature.
  const owner = await resolveProductViewOwner(req as unknown as Request, res);
  const items = await productViewsService.listRecentlyViewed(owner, req.query.limit);
  res.status(200).json({ items });
}
