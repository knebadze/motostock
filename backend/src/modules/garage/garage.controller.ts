import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as garageService from "./garage.service.js";
import type { CreateGarageVehicleInput, UpdateGarageVehicleInput } from "./garage.schema.js";

export async function list(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const items = await garageService.listMyGarage(req.user.sub);
  res.status(200).json({ items });
}

export async function create(
  req: Request<unknown, unknown, CreateGarageVehicleInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const item = await garageService.createGarageVehicle(req.user.sub, req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateGarageVehicleInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const item = await garageService.updateGarageVehicle(
    req.user.sub,
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function uploadImage(req: Request<{ id: string }>, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  if (!req.file) {
    throw new ApiError(400, "სურათი არ არის ატვირთული", "IMAGE_NOT_UPLOADED");
  }

  const item = await garageService.setGarageVehicleImage(
    req.user.sub,
    Number(req.params.id),
    req.file,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  await garageService.deleteGarageVehicle(req.user.sub, Number(req.params.id));
  res.status(204).send();
}

// Admin-scoped variants (workshop screen — add/list a vehicle for ANY
// customer, walk-in or registered) — same service functions as the /me
// routes above, just with an admin-supplied userId instead of the caller's
// own. requireRole(ADMIN) is applied at the router level.
export async function adminList(req: Request<{ userId: string }>, res: Response) {
  const items = await garageService.listMyGarage(Number(req.params.userId));
  res.status(200).json({ items });
}

export async function adminCreate(
  req: Request<{ userId: string }, unknown, CreateGarageVehicleInput>,
  res: Response,
) {
  const item = await garageService.createGarageVehicle(Number(req.params.userId), req.body);
  res.status(201).json({ item });
}
