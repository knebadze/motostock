import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as wishlistService from "./wishlist.service.js";
import type { WishlistOwner } from "./wishlist.repository.js";
import type { CreateWishlistItemInput, WishlistStatusQuery } from "./wishlist.schema.js";

// resolveWishlistOwner (see wishlist.middleware.ts) guarantees exactly one
// of these is set before a handler runs — it 401s otherwise. Narrow
// structural type (not the full generic Request<...>) so this accepts any
// of the differently-typed Request<> instances below.
function getOwner(req: Pick<Request, "user" | "guestId">): WishlistOwner {
  if (req.user) return { userId: req.user.sub };
  if (req.guestId) return { guestId: req.guestId };
  throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
}

export async function list(req: Request, res: Response) {
  const items = await wishlistService.listMyWishlist(getOwner(req));
  res.status(200).json({ items });
}

export async function create(
  req: Request<unknown, unknown, CreateWishlistItemInput>,
  res: Response,
) {
  const item = await wishlistService.addWishlistItem(getOwner(req), req.body);
  res.status(201).json({ item });
}

export async function remove(req: Request, res: Response) {
  await wishlistService.removeWishlistItem(getOwner(req), Number(req.params.id));
  res.status(204).send();
}

export async function count(req: Request, res: Response) {
  const result = await wishlistService.getWishlistCount(getOwner(req));
  res.status(200).json(result);
}

export async function status(
  req: Request<unknown, unknown, unknown, WishlistStatusQuery>,
  res: Response,
) {
  const result = await wishlistService.getWishlistStatus(
    getOwner(req),
    req.query.productIds ?? [],
    req.query.vehicleListingIds ?? [],
  );
  res.status(200).json(result);
}
