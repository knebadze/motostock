import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as productBrandsService from "./product-brands.service.js";
import type {
  CreateProductBrandInput,
  ProductBrandListQuery,
  UpdateProductBrandInput,
} from "./product-brands.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ProductBrandListQuery>,
  res: Response,
) {
  const items = await productBrandsService.listProductBrands(req.query.categoryId);
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await productBrandsService.getProductBrand(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(
  req: Request<unknown, unknown, CreateProductBrandInput>,
  res: Response,
) {
  const item = await productBrandsService.createProductBrand(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateProductBrandInput>,
  res: Response,
) {
  const item = await productBrandsService.updateProductBrand(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await productBrandsService.deleteProductBrand(Number(req.params.id));
  res.status(204).send();
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "ლოგო არ არის მიბმული");
  }

  const item = await productBrandsService.setProductBrandLogo(Number(req.params.id), req.file);
  res.status(200).json({ item });
}
