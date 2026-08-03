import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { getMyAddress, saveMyAddress } from "./addresses.service.js";
import type { UpsertAddressInput } from "./addresses.schema.js";

export async function getMine(req: Request, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const address = await getMyAddress(req.user.sub);
  res.status(200).json({ address });
}

export async function saveMine(
  req: Request<unknown, unknown, UpsertAddressInput>,
  res: Response,
) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const address = await saveMyAddress(req.user.sub, req.body);
  res.status(200).json({ address });
}
