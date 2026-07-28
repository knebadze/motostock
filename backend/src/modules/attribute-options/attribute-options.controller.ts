import type { Request, Response } from "express";
import * as attributeOptionsService from "./attribute-options.service.js";
import type {
  CreateAttributeOptionInput,
  UpdateAttributeOptionInput,
} from "./attribute-options.schema.js";

export async function list(req: Request<{ attributeId: string }>, res: Response) {
  const items = await attributeOptionsService.listAttributeOptions(
    Number(req.params.attributeId),
  );
  res.status(200).json({ items });
}

export async function create(
  req: Request<{ attributeId: string }, unknown, CreateAttributeOptionInput>,
  res: Response,
) {
  const item = await attributeOptionsService.createAttributeOption(
    Number(req.params.attributeId),
    req.body,
  );
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ attributeId: string; id: string }, unknown, UpdateAttributeOptionInput>,
  res: Response,
) {
  const item = await attributeOptionsService.updateAttributeOption(
    Number(req.params.attributeId),
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function remove(
  req: Request<{ attributeId: string; id: string }>,
  res: Response,
) {
  await attributeOptionsService.deleteAttributeOption(
    Number(req.params.attributeId),
    Number(req.params.id),
  );
  res.status(204).send();
}
