import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as promoCodesService from "./promo-codes.service.js";
import type {
  CreatePromoCodeInput,
  ListPromoCodesQuery,
  PromoCodeHeroSlideInput,
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

export async function getHeroSlide(req: Request<{ id: string }>, res: Response) {
  const item = await promoCodesService.getPromoCodeHeroSlide(Number(req.params.id));
  res.status(200).json({ item });
}

export async function setHeroSlide(
  req: Request<{ id: string }, unknown, PromoCodeHeroSlideInput>,
  res: Response,
) {
  const item = await promoCodesService.setPromoCodeHeroSlide(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function uploadHeroSlideImage(req: Request<{ id: string }>, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის ატვირთული");
  }
  const item = await promoCodesService.setPromoCodeHeroSlideImage(Number(req.params.id), req.file);
  res.status(200).json({ item });
}
