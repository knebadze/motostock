import type { Request, Response } from "express";
import * as attributesService from "./attributes.service.js";
import type {
  AttributeListQuery,
  CreateAttributeInput,
  UpdateAttributeInput,
} from "./attributes.schema.js";

export async function list(req: Request<unknown, unknown, unknown, AttributeListQuery>, res: Response) {
  const items = await attributesService.listAttributes(req.query.categoryId);
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await attributesService.getAttribute(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(
  req: Request<unknown, unknown, CreateAttributeInput>,
  res: Response,
) {
  const item = await attributesService.createAttribute(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateAttributeInput>,
  res: Response,
) {
  const item = await attributesService.updateAttribute(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await attributesService.deleteAttribute(Number(req.params.id));
  res.status(204).send();
}
