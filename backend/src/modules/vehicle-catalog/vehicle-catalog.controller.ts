import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as vehicleCatalogService from "./vehicle-catalog.service.js";
import type {
  CreateVehicleCatalogInput,
  UpdateVehicleCatalogInput,
} from "./vehicle-catalog.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await vehicleCatalogService.listVehicleCatalog();
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await vehicleCatalogService.getVehicleCatalogEntry(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(
  req: Request<unknown, unknown, CreateVehicleCatalogInput>,
  res: Response,
) {
  const item = await vehicleCatalogService.createVehicleCatalogEntry(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateVehicleCatalogInput>,
  res: Response,
) {
  const item = await vehicleCatalogService.updateVehicleCatalogEntry(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await vehicleCatalogService.deleteVehicleCatalogEntry(Number(req.params.id));
  res.status(204).send();
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის მიბმული");
  }

  const item = await vehicleCatalogService.setVehicleCatalogImage(
    Number(req.params.id),
    req.file,
  );
  res.status(200).json({ item });
}
