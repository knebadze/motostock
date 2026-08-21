import type { Request, Response } from "express";
import * as serviceTypesService from "./service-types.service.js";
import type {
  CreateServiceTypeInput,
  ReorderServiceTypesInput,
  UpdateServiceTypeInput,
} from "./service-types.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await serviceTypesService.listServiceTypes();
  res.status(200).json({ items });
}

export async function create(req: Request<unknown, unknown, CreateServiceTypeInput>, res: Response) {
  const item = await serviceTypesService.createServiceType(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateServiceTypeInput>,
  res: Response,
) {
  const item = await serviceTypesService.updateServiceType(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function reorder(
  req: Request<unknown, unknown, ReorderServiceTypesInput>,
  res: Response,
) {
  const items = await serviceTypesService.reorderServiceTypes(req.body);
  res.status(200).json({ items });
}

export async function remove(req: Request, res: Response) {
  await serviceTypesService.deleteServiceType(Number(req.params.id));
  res.status(204).send();
}
