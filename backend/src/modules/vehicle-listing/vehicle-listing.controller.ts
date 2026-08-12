import type { Request, Response } from "express";
import { resolveProductViewOwner } from "../product-views/product-views.middleware.js";
import { recordVehicleListingView } from "../vehicle-listing-views/vehicle-listing-views.service.js";
import * as vehicleListingService from "./vehicle-listing.service.js";
import type {
  CreateVehicleListingInput,
  PopularVehicleListingsQuery,
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

export async function getPopular(
  req: Request<unknown, unknown, unknown, PopularVehicleListingsQuery>,
  res: Response,
) {
  const items = await vehicleListingService.listPopularVehicleListings(req.query.limit ?? 10);
  res.status(200).json({ items });
}

export async function getOne(req: Request, res: Response) {
  const item = await vehicleListingService.getVehicleListing(Number(req.params.id));

  // Owner resolution mutates cookies on `res`, so it must run before the
  // response is sent below. The actual write is fire-and-forget (not
  // awaited) — a view-tracking failure must never turn a successful listing
  // page load into an error response. Same pattern as products.controller.ts's
  // getBySlug.
  const owner = await resolveProductViewOwner(req, res);
  recordVehicleListingView(owner, item.id).catch(() => {});

  res.status(200).json({ item });
}

export async function getDetailAdmin(req: Request, res: Response) {
  const item = await vehicleListingService.getVehicleListingDetailAdmin(Number(req.params.id));
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
