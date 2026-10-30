import type { Request, Response } from "express";
import * as modelsService from "./models.service.js";
import type { CreateModelInput, ModelListQuery, UpdateModelInput } from "./models.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ModelListQuery>,
  res: Response,
) {
  const result = await modelsService.listModels(req.query);
  // Unpaginated callers (brand/model pickers, PromoCodeFormModal) keep the
  // long-standing `{ models: [...] }` shape; only the admin models list
  // screen sends page/pageSize and gets the full pagination envelope.
  if (req.query.page == null && req.query.pageSize == null) {
    res.status(200).json({ models: result.items });
    return;
  }
  res.status(200).json(result);
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
