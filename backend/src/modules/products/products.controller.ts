import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { resolveProductViewOwner } from "../product-views/product-views.middleware.js";
import { recordProductView } from "../product-views/product-views.service.js";
import * as productsService from "./products.service.js";
import type {
  CheckCompatibilityInput,
  CreateProductInput,
  PopularProductsQuery,
  ProductDetailQuery,
  ProductListQuery,
  ProductSlugParam,
  UpdateProductInput,
} from "./products.schema.js";

export async function list(req: Request<unknown, unknown, unknown, ProductListQuery>, res: Response) {
  const items = await productsService.listProducts(req.query);
  res.status(200).json({ items });
}

export async function getPopular(
  req: Request<unknown, unknown, unknown, PopularProductsQuery>,
  res: Response,
) {
  const items = await productsService.listPopularProducts(req.query.limit ?? 10);
  res.status(200).json({ items });
}

export async function checkCompatibility(
  req: Request<unknown, unknown, CheckCompatibilityInput>,
  res: Response,
) {
  const compatibleProductIds = await productsService.checkProductsCompatibility(
    req.body.productIds,
    req.body.vehicleCatalogId,
  );
  res.status(200).json({ compatibleProductIds });
}

export async function getOne(req: Request, res: Response) {
  const item = await productsService.getProduct(Number(req.params.id));
  res.status(200).json({ item });
}

export async function getBySlug(
  req: Request<ProductSlugParam, unknown, unknown, ProductDetailQuery>,
  res: Response,
) {
  const item = await productsService.getProductDetail(req.params.slug, req.query.vehicleCatalogId);

  // Owner resolution mutates cookies on `res`, so it must run before the
  // response is sent below. The actual write is fire-and-forget (not
  // awaited) — a view-tracking failure must never turn a successful product
  // page load into an error response.
  // Same cast reasoning as product-views.controller.ts's getRecentlyViewed.
  const owner = await resolveProductViewOwner(req as unknown as Request, res);
  recordProductView(owner, item.id).catch(() => {});

  res.status(200).json({ item });
}

export async function getDetailAdmin(req: Request, res: Response) {
  const item = await productsService.getProductDetailAdmin(Number(req.params.id));
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
