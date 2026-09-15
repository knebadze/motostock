import type { Request, Response } from "express";
import * as bulkDiscountsService from "./bulk-discounts.service.js";
import type {
  BulkApplyDiscountsInput,
  BulkDiscountCandidatesQuery,
  ListDiscountHistoryQuery,
} from "./bulk-discounts.schema.js";

export async function listCandidates(
  // Typed as Partial: the `validate` middleware already guarantees
  // targetType/categoryId are present (required, non-optional in the
  // schema) before this handler runs — Partial here is only to satisfy
  // Express's route generics, which check assignability against the
  // default ParsedQs type.
  req: Request<unknown, unknown, unknown, Partial<BulkDiscountCandidatesQuery>>,
  res: Response,
) {
  const items = await bulkDiscountsService.listBulkDiscountCandidates(req.query as BulkDiscountCandidatesQuery);
  res.status(200).json({ items });
}

export async function listDiscounts(
  req: Request<unknown, unknown, unknown, ListDiscountHistoryQuery>,
  res: Response,
) {
  const result = await bulkDiscountsService.listDiscountHistory(req.query);
  res.status(200).json(result);
}

export async function apply(req: Request<unknown, unknown, BulkApplyDiscountsInput>, res: Response) {
  const result = await bulkDiscountsService.applyBulkDiscounts(req.body);
  res.status(201).json(result);
}
