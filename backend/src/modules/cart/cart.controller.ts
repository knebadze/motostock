import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as cartService from "./cart.service.js";
import type { CartOwner } from "./cart.repository.js";
import type { CreateCartItemInput, UpdateCartItemInput } from "./cart.schema.js";

// resolveCartOwner (see cart.middleware.ts) guarantees exactly one of these
// is set before a handler runs — it 401s otherwise. Narrow structural type
// (not the full generic Request<...>) so this accepts any of the
// differently-typed Request<> instances below.
function getOwner(req: Pick<Request, "user" | "guestId">): CartOwner {
  if (req.user) return { userId: req.user.sub };
  if (req.guestId) return { guestId: req.guestId };
  throw new ApiError(401, "Not authenticated");
}

export async function list(req: Request, res: Response) {
  const cart = await cartService.listMyCart(getOwner(req));
  res.status(200).json(cart);
}

export async function count(req: Request, res: Response) {
  const result = await cartService.getMyCartCount(getOwner(req));
  res.status(200).json(result);
}

export async function create(
  req: Request<unknown, unknown, CreateCartItemInput>,
  res: Response,
) {
  const item = await cartService.addCartItem(getOwner(req), req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateCartItemInput>,
  res: Response,
) {
  const item = await cartService.updateCartItemQuantity(
    getOwner(req),
    Number(req.params.id),
    req.body.quantity,
  );
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await cartService.removeCartItem(getOwner(req), Number(req.params.id));
  res.status(204).send();
}
