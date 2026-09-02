import type { Request, Response } from "express";
import * as compatibilityService from "./compatibility.service.js";
import type { ListCompatibilityQuery } from "./compatibility.schema.js";

export async function list(
  req: Request<unknown, unknown, unknown, ListCompatibilityQuery>,
  res: Response,
) {
  const result = await compatibilityService.listAllCompatibility(req.query);
  res.status(200).json(result);
}

export async function listVehiclesForProduct(req: Request, res: Response) {
  const items = await compatibilityService.getCompatibleVehiclesForProduct(Number(req.params.productId));
  res.status(200).json({ items });
}
