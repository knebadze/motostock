import type { Request, Response } from "express";
import * as modelsService from "./models.service.js";
import type { CreateModelInput, UpdateModelInput } from "./models.schema.js";

export async function list(req: Request, res: Response) {
  const rawBrandId = req.query.brandId ? Number(req.query.brandId) : undefined;
  const brandId = Number.isFinite(rawBrandId) ? rawBrandId : undefined;
  const models = await modelsService.listModels(brandId);
  res.status(200).json({ models });
}

export async function getOne(req: Request, res: Response) {
  const model = await modelsService.getModel(Number(req.params.id));
  res.status(200).json({ model });
}

export async function create(
  req: Request<unknown, unknown, CreateModelInput>,
  res: Response,
) {
  const model = await modelsService.createModel(req.body);
  res.status(201).json({ model });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateModelInput>,
  res: Response,
) {
  const model = await modelsService.updateModel(Number(req.params.id), req.body);
  res.status(200).json({ model });
}

export async function remove(req: Request, res: Response) {
  await modelsService.deleteModel(Number(req.params.id));
  res.status(204).send();
}
