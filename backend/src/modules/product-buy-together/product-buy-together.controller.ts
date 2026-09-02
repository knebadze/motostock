import type { Request, Response } from "express";
import * as productBuyTogetherService from "./product-buy-together.service.js";
import type {
  CreateProductBuyTogetherInput,
  ListProductBuyTogetherAdminQuery,
} from "./product-buy-together.schema.js";

export async function list(req: Request<{ productId: string }>, res: Response) {
  const items = await productBuyTogetherService.listProductBuyTogether(Number(req.params.productId));
  res.status(200).json({ items });
}

export async function create(
  req: Request<{ productId: string }, unknown, CreateProductBuyTogetherInput>,
  res: Response,
) {
  const item = await productBuyTogetherService.createProductBuyTogether(
    Number(req.params.productId),
    req.body,
  );
  res.status(201).json({ item });
}

export async function remove(req: Request<{ productId: string; id: string }>, res: Response) {
  await productBuyTogetherService.deleteProductBuyTogether(
    Number(req.params.productId),
    Number(req.params.id),
  );
  res.status(204).send();
}

export async function listAll(
  req: Request<unknown, unknown, unknown, ListProductBuyTogetherAdminQuery>,
  res: Response,
) {
  const result = await productBuyTogetherService.listAllProductBuyTogether(req.query);
  res.status(200).json(result);
}
