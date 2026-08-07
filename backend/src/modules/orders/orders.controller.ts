import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as ordersService from "./orders.service.js";
import type { CheckoutInput, ListOrdersQuery } from "./orders.schema.js";

// requireAuth (see orders.routes.ts) guarantees req.user is set before any
// handler here runs — this is just the narrow structural read of it.
function requireUserId(req: Pick<Request, "user">): number {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  return req.user.sub;
}

export async function preview(req: Request<unknown, unknown, CheckoutInput>, res: Response) {
  const result = await ordersService.previewCheckout(requireUserId(req), req.body);
  res.status(200).json(result);
}

export async function checkout(req: Request<unknown, unknown, CheckoutInput>, res: Response) {
  const order = await ordersService.placeOrder(requireUserId(req), req.body);
  res.status(201).json({ order });
}

export async function list(req: Request, res: Response) {
  const orders = await ordersService.listMyOrders(requireUserId(req));
  res.status(200).json({ orders });
}

export async function getOne(req: Request, res: Response) {
  const order = await ordersService.getMyOrder(requireUserId(req), Number(req.params.id));
  res.status(200).json({ order });
}

// Admin-only — requireRole(ROLES.ADMIN) gates both routes (see orders.routes.ts).
export async function listAll(
  req: Request<unknown, unknown, unknown, ListOrdersQuery>,
  res: Response,
) {
  const orders = await ordersService.listAllOrders(req.query);
  res.status(200).json({ orders });
}

export async function getAny(req: Request, res: Response) {
  const order = await ordersService.getAnyOrder(Number(req.params.id));
  res.status(200).json({ order });
}
