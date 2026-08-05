import type { Request, Response } from "express";
import * as promoCodesService from "./promo-codes.service.js";
import type {
  CreatePromoCodeInput,
  ListPromoCodesQuery,
  UpdatePromoCodeInput,
} from "./promo-codes.schema.js";

export async function list(
  // Typed as Partial: the `validate` middleware already guarantees domain
  // is present (required, non-optional in the schema) before this handler
  // runs — Partial here is only to satisfy Express's route generics, which
  // check assignability against the default ParsedQs type.
  req: Request<unknown, unknown, unknown, Partial<ListPromoCodesQuery>>,
  res: Response,
) {
  const items = await promoCodesService.listPromoCodes(req.query as ListPromoCodesQuery);
  res.status(200).json({ items });
}

export async function get(req: Request<{ id: string }>, res: Response) {
  const item = await promoCodesService.getPromoCode(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(req: Request<unknown, unknown, CreatePromoCodeInput>, res: Response) {
  const item = await promoCodesService.createPromoCode(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdatePromoCodeInput>,
  res: Response,
) {
  const item = await promoCodesService.updatePromoCode(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  await promoCodesService.deletePromoCode(Number(req.params.id));
  res.status(204).send();
}
