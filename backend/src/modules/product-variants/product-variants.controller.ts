import type { Request, Response } from "express";
import * as productVariantsService from "./product-variants.service.js";
import type {
  CreateProductVariantInput,
  ProductVariantListQuery,
  UpdateProductVariantInput,
} from "./product-variants.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ProductVariantListQuery>,
  res: Response,
) {
  const items = await productVariantsService.listProductVariants(req.query.productId);
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await productVariantsService.getProductVariant(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(
  req: Request<unknown, unknown, CreateProductVariantInput>,
  res: Response,
) {
  const item = await productVariantsService.createProductVariant(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateProductVariantInput>,
  res: Response,
) {
  const item = await productVariantsService.updateProductVariant(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await productVariantsService.deleteProductVariant(Number(req.params.id));
  res.status(204).send();
}
