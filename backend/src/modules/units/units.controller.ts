import type { Request, Response } from "express";
import * as unitsService from "./units.service.js";
import type { CreateUnitInput, UpdateUnitInput } from "./units.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await unitsService.listUnits();
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await unitsService.getUnit(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(req: Request<unknown, unknown, CreateUnitInput>, res: Response) {
  const item = await unitsService.createUnit(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateUnitInput>,
  res: Response,
) {
  const item = await unitsService.updateUnit(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await unitsService.deleteUnit(Number(req.params.id));
  res.status(204).send();
}
