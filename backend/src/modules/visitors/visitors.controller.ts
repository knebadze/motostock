import type { Request, Response } from "express";
import { resolveVisitorOwner } from "./visitors.middleware.js";
import * as visitorsService from "./visitors.service.js";

export async function ping(req: Request, res: Response) {
  const owner = await resolveVisitorOwner(req, res);
  await visitorsService.recordVisitorPing(owner);
  res.status(204).send();
}

export async function overview(_req: Request, res: Response) {
  const result = await visitorsService.getVisitorOverview();
  res.status(200).json(result);
}
