import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import {
  createMyAddress,
  deleteMyAddress,
  listMyAddresses,
  updateMyAddress,
} from "./addresses.service.js";
import type { AddressInput } from "./addresses.schema.js";

export async function list(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const addresses = await listMyAddresses(req.user.sub);
  res.status(200).json({ addresses });
}

export async function create(req: Request<unknown, unknown, AddressInput>, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const address = await createMyAddress(req.user.sub, req.body);
  res.status(201).json({ address });
}

export async function update(
  req: Request<{ id: string }, unknown, AddressInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  const address = await updateMyAddress(req.user.sub, Number(req.params.id), req.body);
  res.status(200).json({ address });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }

  await deleteMyAddress(req.user.sub, Number(req.params.id));
  res.status(204).send();
}
