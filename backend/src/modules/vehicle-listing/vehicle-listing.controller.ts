import type { Request, Response } from "express";
import * as vehicleListingService from "./vehicle-listing.service.js";
import type {
  CreateVehicleListingInput,
  UpdateVehicleListingInput,
  VehicleListingListQuery,
} from "./vehicle-listing.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, VehicleListingListQuery>,
  res: Response,
) {
  const items = await vehicleListingService.listVehicleListings(req.query);
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await vehicleListingService.getVehicleListing(Number(req.params.id));
  res.status(200).json({ item });
}

export async function create(
  req: Request<unknown, unknown, CreateVehicleListingInput>,
  res: Response,
) {
  const item = await vehicleListingService.createVehicleListing(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateVehicleListingInput>,
  res: Response,
) {
  const item = await vehicleListingService.updateVehicleListing(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await vehicleListingService.deleteVehicleListing(Number(req.params.id));
  res.status(204).send();
}
