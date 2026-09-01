import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as compareService from "./compare.service.js";
import type { CompareOwner } from "./compare.repository.js";
import type { CreateCompareItemInput, CompareStatusQuery } from "./compare.schema.js";

// resolveCompareOwner (see compare.middleware.ts) always sets exactly one
// of req.user/req.guestId before a handler runs — same narrow structural
// type as wishlist.controller.ts's getOwner.
function getOwner(req: Pick<Request, "user" | "guestId">): CompareOwner {
  if (req.user) return { userId: req.user.sub };
  if (req.guestId) return { guestId: req.guestId };
  throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
}

export async function list(req: Request, res: Response) {
  const items = await compareService.listMyCompare(getOwner(req));
  res.status(200).json({ items });
}

export async function create(
  req: Request<unknown, unknown, CreateCompareItemInput>,
  res: Response,
) {
  const item = await compareService.addCompareItem(getOwner(req), req.body);
  res.status(201).json({ item });
}

export async function remove(req: Request, res: Response) {
  await compareService.removeCompareItem(getOwner(req), Number(req.params.id));
  res.status(204).send();
}

export async function count(req: Request, res: Response) {
  const result = await compareService.getCompareCount(getOwner(req));
  res.status(200).json(result);
}

export async function status(
  req: Request<unknown, unknown, unknown, CompareStatusQuery>,
  res: Response,
) {
  const result = await compareService.getCompareStatus(
    getOwner(req),
    req.query.productIds ?? [],
    req.query.vehicleListingIds ?? [],
  );
  res.status(200).json(result);
}
