import type { Request, Response } from "express";
import * as productFitmentService from "./product-fitment.service.js";
import type { CreateProductFitmentInput } from "./product-fitment.schema.js";

export async function list(req: Request<{ productId: string }>, res: Response) {
  const items = await productFitmentService.listProductFitments(Number(req.params.productId));
  res.status(200).json({ items });
}

export async function create(
  req: Request<{ productId: string }, unknown, CreateProductFitmentInput>,
  res: Response,
) {
  const item = await productFitmentService.createProductFitment(
    Number(req.params.productId),
    req.body,
  );
  res.status(201).json({ item });
}

export async function remove(req: Request<{ productId: string; id: string }>, res: Response) {
  await productFitmentService.deleteProductFitment(
    Number(req.params.productId),
    Number(req.params.id),
  );
  res.status(204).send();
}
