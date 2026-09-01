import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as recommendationsService from "./recommendations.service.js";
import type {
  PopularForVehicleQuery,
  ProductRecommendationsQuery,
  RecommendedForMeQuery,
} from "./recommendations.schema.js";

export async function getSimilar(
  req: Request<{ productId: string }, unknown, unknown, ProductRecommendationsQuery>,
  res: Response,
) {
  const items = await recommendationsService.listSimilarProducts(Number(req.params.productId), {
    vehicleCatalogId: req.query.vehicleCatalogId,
    limit: req.query.limit,
  });
  res.status(200).json({ items });
}

export async function getFrequentlyBoughtTogether(
  req: Request<{ productId: string }, unknown, unknown, ProductRecommendationsQuery>,
  res: Response,
) {
  const items = await recommendationsService.listFrequentlyBoughtTogether(Number(req.params.productId), {
    vehicleCatalogId: req.query.vehicleCatalogId,
    limit: req.query.limit,
  });
  res.status(200).json({ items });
}

export async function getViewedTogether(
  req: Request<{ productId: string }, unknown, unknown, ProductRecommendationsQuery>,
  res: Response,
) {
  const items = await recommendationsService.listViewedTogether(Number(req.params.productId), {
    vehicleCatalogId: req.query.vehicleCatalogId,
    limit: req.query.limit,
  });
  res.status(200).json({ items });
}

export async function getPopularForVehicle(req: Request, res: Response) {
  // Typed via a plain (unnarrowed) Request, not Request<..., PopularForVehicleQuery>:
  // Express's handler-array overload resolution can't unify a query type
  // with a *required* field against validate()'s untyped middleware handler
  // (an all-optional query type, like every other query schema in this
  // codebase, has no such issue). validate() has already parsed/coerced
  // req.query against the schema by the time this runs, so the cast is safe.
  const query = req.query as unknown as PopularForVehicleQuery;
  const items = await recommendationsService.listPopularForVehicle(query.vehicleCatalogId, query.limit);
  res.status(200).json({ items });
}

export async function getForMe(
  req: Request<unknown, unknown, unknown, RecommendedForMeQuery>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const items = await recommendationsService.listRecommendedForUser(req.user.sub, req.query.limit);
  res.status(200).json({ items });
}
