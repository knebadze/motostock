import type { Request, Response } from "express";
import * as bulkProductDiscountsService from "./bulk-product-discounts.service.js";
import type {
  BulkApplyProductDiscountsInput,
  BulkDiscountCandidatesQuery,
} from "./bulk-product-discounts.schema.js";

export async function listCandidates(
  // Typed as Partial: the `validate` middleware already guarantees
  // categoryId is present (required, non-optional in the schema) before
  // this handler runs — Partial here is only to satisfy Express's route
  // generics, which check assignability against the default ParsedQs type.
  req: Request<unknown, unknown, unknown, Partial<BulkDiscountCandidatesQuery>>,
  res: Response,
) {
  const items = await bulkProductDiscountsService.listBulkDiscountCandidates(
    req.query as BulkDiscountCandidatesQuery,
  );
  res.status(200).json({ items });
}

export async function apply(
  req: Request<unknown, unknown, BulkApplyProductDiscountsInput>,
  res: Response,
) {
  const items = await bulkProductDiscountsService.applyBulkProductDiscounts(req.body);
  res.status(201).json({ items });
}
