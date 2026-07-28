import type { Request, Response } from "express";
import * as finaSyncService from "./fina-sync.service.js";

export async function run(req: Request, res: Response) {
  const result = await finaSyncService.runSync("MANUAL", req.user!.sub);
  res.status(200).json({ run: result });
}

export async function list(_req: Request, res: Response) {
  const runs = await finaSyncService.listSyncRuns();
  res.status(200).json({ runs });
}
