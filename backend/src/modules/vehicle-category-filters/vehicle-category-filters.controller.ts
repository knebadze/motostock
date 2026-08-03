import type { Request, Response } from "express";
import * as vehicleCategoryFiltersService from "./vehicle-category-filters.service.js";
import type {
  CreateVehicleCategoryFilterInput,
  UpdateVehicleCategoryFilterInput,
  VehicleCategoryFilterListQuery,
} from "./vehicle-category-filters.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, Partial<VehicleCategoryFilterListQuery>>,
  res: Response,
) {
  const items = await vehicleCategoryFiltersService.listVehicleCategoryFilters(
    Number(req.query.categoryId),
  );
  res.status(200).json({ items });
}

export async function create(
  req: Request<unknown, unknown, CreateVehicleCategoryFilterInput>,
  res: Response,
) {
  const item = await vehicleCategoryFiltersService.createVehicleCategoryFilter(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateVehicleCategoryFilterInput>,
  res: Response,
) {
  const item = await vehicleCategoryFiltersService.updateVehicleCategoryFilterSortOrder(
    Number(req.params.id),
    req.body.sortOrder,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await vehicleCategoryFiltersService.deleteVehicleCategoryFilter(Number(req.params.id));
  res.status(204).send();
}
