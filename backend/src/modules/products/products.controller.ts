import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as productsService from "./products.service.js";
import type {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from "./products.schema.js";

export async function list(req: Request<unknown, unknown, unknown, ProductListQuery>, res: Response) {
  const items = await productsService.listProducts(req.query.categoryId);
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await productsService.getProduct(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(
  req: Request<unknown, unknown, CreateProductInput>,
  res: Response,
) {
  const item = await productsService.createProduct(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateProductInput>,
  res: Response,
) {
  const item = await productsService.updateProduct(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await productsService.deleteProduct(Number(req.params.id));
  res.status(204).send();
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის მიბმული");
  }
  const item = await productsService.setProductImage(Number(req.params.id), req.file);
  res.status(200).json({ item });
}
