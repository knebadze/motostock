import type { Request, Response } from "express";
import * as finaSyncService from "./fina-sync.service.js";
import { confirmOrderAfterFinaCheck } from "../orders/orders.service.js";

export async function run(req: Request, res: Response) {
  const result = await finaSyncService.runSync("MANUAL", req.user!.sub);
  res.status(200).json({ run: result });
}

export async function list(_req: Request, res: Response) {
  const runs = await finaSyncService.listSyncRuns();
  res.status(200).json({ runs });
}

export async function syncOrder(req: Request, res: Response) {
  const orderId = Number(req.params.orderId);
  const result = await finaSyncService.syncOrderStock(orderId);

  // Every one of this order's FINA-linked items was found and refreshed —
  // strong enough confirmation to auto-confirm a still-PENDING order (see
  // orders.service.ts's confirmOrderAfterFinaCheck), same bar an admin
  // manually reviewing the sync result would apply themselves.
  const order =
    result.checked > 0 && result.updated === result.checked
      ? await confirmOrderAfterFinaCheck(orderId)
      : null;

  res.status(200).json({ ...result, order });
}
