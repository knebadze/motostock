import type { Request, Response } from "express";
import * as bulkVehicleListingDiscountsService from "./bulk-vehicle-listing-discounts.service.js";
import type {
  BulkApplyVehicleListingDiscountsInput,
  BulkVehicleDiscountCandidatesQuery,
} from "./bulk-vehicle-listing-discounts.schema.js";

export async function listCandidates(
  // Typed as Partial: the `validate` middleware already guarantees
  // categoryId is present (required, non-optional in the schema) before
  // this handler runs — Partial here is only to satisfy Express's route
  // generics, which check assignability against the default ParsedQs type.
  req: Request<unknown, unknown, unknown, Partial<BulkVehicleDiscountCandidatesQuery>>,
  res: Response,
) {
  const items = await bulkVehicleListingDiscountsService.listBulkVehicleDiscountCandidates(
    req.query as BulkVehicleDiscountCandidatesQuery,
  );
  res.status(200).json({ items });
}

export async function apply(
  req: Request<unknown, unknown, BulkApplyVehicleListingDiscountsInput>,
  res: Response,
) {
  const items = await bulkVehicleListingDiscountsService.applyBulkVehicleListingDiscounts(req.body);
  res.status(201).json({ items });
}
