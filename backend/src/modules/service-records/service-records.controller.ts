import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { ROLES } from "../../lib/roles.js";
import * as serviceRecordsService from "./service-records.service.js";
import type {
  CreateServiceRecordInput,
  ListServiceRecordsQuery,
  UpdateServiceRecordInput,
} from "./service-records.schema.js";

export async function list(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  // Cast, not a generic on the handler signature — a query schema whose
  // only field is required (not optional) isn't structurally assignable
  // from Express's default ParsedQs at the router.get(...) call site.
  // validate() already guarantees this shape at runtime.
  const { garageVehicleId } = req.query as unknown as ListServiceRecordsQuery;
  const items = await serviceRecordsService.listServiceRecordsForVehicle(
    garageVehicleId,
    req.user.sub,
    req.user.role === ROLES.ADMIN,
  );
  res.status(200).json({ items });
}

export async function create(
  req: Request<unknown, unknown, CreateServiceRecordInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  const item = await serviceRecordsService.createServiceRecord(req.body, req.user.sub);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateServiceRecordInput>,
  res: Response,
) {
  const item = await serviceRecordsService.updateServiceRecord(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await serviceRecordsService.deleteServiceRecord(Number(req.params.id));
  res.status(204).send();
}
