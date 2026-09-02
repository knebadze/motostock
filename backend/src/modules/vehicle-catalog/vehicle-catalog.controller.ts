import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as vehicleCatalogService from "./vehicle-catalog.service.js";
import { generateVehicleCatalogTemplate } from "./vehicle-catalog-template.service.js";
import { bulkImportVehicleCatalog } from "./vehicle-catalog-bulk-import.service.js";
import type {
  CreateVehicleCatalogInput,
  SubmitVehicleCatalogInput,
  UpdateVehicleCatalogInput,
  VehicleCatalogListQuery,
} from "./vehicle-catalog.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, VehicleCatalogListQuery>,
  res: Response,
) {
  const result = await vehicleCatalogService.listVehicleCatalog(req.query);
  res.status(200).json(result);
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

export async function submit(
  req: Request<unknown, unknown, SubmitVehicleCatalogInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const item = await vehicleCatalogService.submitVehicleCatalogEntry(req.user.sub, req.body);
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

export async function downloadTemplate(_req: Request, res: Response) {
  const buffer = await generateVehicleCatalogTemplate();
  res.status(200);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", 'attachment; filename="vehicle-catalog-template.xlsx"');
  res.send(buffer);
}

export async function bulkImport(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "ფაილი არ არის მიბმული");
  }

  const result = await bulkImportVehicleCatalog(req.file.buffer);
  res.status(200).json(result);
}
