import type { Request, Response } from "express";
import * as productVariantDiscountsService from "./product-variant-discounts.service.js";
import type {
  CreateProductVariantDiscountInput,
  UpdateProductVariantDiscountInput,
} from "./product-variant-discounts.schema.js";

export async function list(req: Request<{ variantId: string }>, res: Response) {
  const items = await productVariantDiscountsService.listDiscounts(
    Number(req.params.variantId),
  );
  res.status(200).json({ items });
}

export async function create(
  req: Request<{ variantId: string }, unknown, CreateProductVariantDiscountInput>,
  res: Response,
) {
  const item = await productVariantDiscountsService.createDiscount(
    Number(req.params.variantId),
    req.body,
  );
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ variantId: string; id: string }, unknown, UpdateProductVariantDiscountInput>,
  res: Response,
) {
  const item = await productVariantDiscountsService.updateDiscount(
    Number(req.params.variantId),
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function remove(
  req: Request<{ variantId: string; id: string }>,
  res: Response,
) {
  await productVariantDiscountsService.deleteDiscount(
    Number(req.params.variantId),
    Number(req.params.id),
  );
  res.status(204).send();
}
