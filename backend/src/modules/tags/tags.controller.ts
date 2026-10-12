import type { Request, Response } from "express";
import * as tagsService from "./tags.service.js";
import type { BulkTagProductsInput, CreateTagInput, SetProductTagsInput, UpdateTagInput } from "./tags.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await tagsService.listTags();
  res.status(200).json({ items });
}

export async function create(req: Request<unknown, unknown, CreateTagInput>, res: Response) {
  const item = await tagsService.createTag(req.body);
  res.status(201).json({ item });
}

export async function update(req: Request<{ id: string }, unknown, UpdateTagInput>, res: Response) {
  const item = await tagsService.updateTag(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  await tagsService.deleteTag(Number(req.params.id));
  res.status(204).send();
}

export async function listProducts(req: Request<{ id: string }>, res: Response) {
  const items = await tagsService.listTagProducts(Number(req.params.id));
  res.status(200).json({ items });
}

export async function addToProducts(
  req: Request<{ id: string }, unknown, BulkTagProductsInput>,
  res: Response,
) {
  const result = await tagsService.addTagToProducts(Number(req.params.id), req.body.productIds);
  res.status(200).json(result);
}

export async function removeFromProducts(
  req: Request<{ id: string }, unknown, BulkTagProductsInput>,
  res: Response,
) {
  const result = await tagsService.removeTagFromProducts(Number(req.params.id), req.body.productIds);
  res.status(200).json(result);
}

export async function getProductTags(req: Request<{ productId: string }>, res: Response) {
  const items = await tagsService.getProductTags(Number(req.params.productId));
  res.status(200).json({ items });
}

export async function setProductTags(
  req: Request<{ productId: string }, unknown, SetProductTagsInput>,
  res: Response,
) {
  const items = await tagsService.setProductTags(Number(req.params.productId), req.body.tagIds);
  res.status(200).json({ items });
}
