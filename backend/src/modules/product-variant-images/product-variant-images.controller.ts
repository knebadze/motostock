import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as productVariantImagesService from "./product-variant-images.service.js";
import type { ReorderProductVariantImagesInput } from "./product-variant-images.schema.js";

export async function list(req: Request<{ variantId: string }>, res: Response) {
  const items = await productVariantImagesService.listImages(Number(req.params.variantId));
  res.status(200).json({ items });
}

export async function upload(req: Request<{ variantId: string }>, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw new ApiError(400, "სურათი არ არის მიბმული");
  }

  const items = await productVariantImagesService.uploadImages(
    Number(req.params.variantId),
    files,
  );
  res.status(201).json({ items });
}

export async function reorder(
  req: Request<{ variantId: string }, unknown, ReorderProductVariantImagesInput>,
  res: Response,
) {
  const items = await productVariantImagesService.reorderImages(
    Number(req.params.variantId),
    req.body,
  );
  res.status(200).json({ items });
}

export async function remove(
  req: Request<{ variantId: string; imageId: string }>,
  res: Response,
) {
  await productVariantImagesService.deleteImage(
    Number(req.params.variantId),
    Number(req.params.imageId),
  );
  res.status(204).send();
}
