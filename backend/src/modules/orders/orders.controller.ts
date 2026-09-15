import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import { getClientIp } from "../../lib/request-ip.js";
import { previewCheckout, placeOrder } from "./orders.service.js";
import { listMyOrders, getMyOrder, reorderOrder, listAllOrders, getAnyOrder } from "./orders-query.service.js";
import { updateOrderStatus, retryOrderFinaSync } from "./orders-admin.service.js";
import type { CheckoutInput, ListOrdersQuery, UpdateOrderStatusInput } from "./orders.schema.js";

// requireAuth (see orders.routes.ts) guarantees req.user is set before any
// handler here runs — this is just the narrow structural read of it.
function requireUserId(req: Pick<Request, "user">): number {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
  }
  return req.user.sub;
}

export async function preview(req: Request<unknown, unknown, CheckoutInput>, res: Response) {
  const result = await previewCheckout(requireUserId(req), req.body);
  res.status(200).json(result);
}

export async function checkout(req: Request<unknown, unknown, CheckoutInput>, res: Response) {
  const order = await placeOrder(
    requireUserId(req),
    req.body,
    getClientIp(req as unknown as Request),
  );
  res.status(201).json({ order });
}

export async function list(req: Request, res: Response) {
  const orders = await listMyOrders(requireUserId(req));
  res.status(200).json({ orders });
}

export async function getOne(req: Request, res: Response) {
  const order = await getMyOrder(requireUserId(req), Number(req.params.id));
  res.status(200).json({ order });
}

export async function reorder(req: Request, res: Response) {
  const result = await reorderOrder(requireUserId(req), Number(req.params.id));
  res.status(200).json(result);
}

// Admin-only — requireRole(ROLES.ADMIN) gates both routes (see orders.routes.ts).
export async function listAll(
  req: Request<unknown, unknown, unknown, ListOrdersQuery>,
  res: Response,
) {
  const { orders, total, page, pageSize } = await listAllOrders(req.query);
  res.status(200).json({ orders, total, page, pageSize });
}

export async function getAny(req: Request, res: Response) {
  const order = await getAnyOrder(Number(req.params.id));
  res.status(200).json({ order });
}

export async function updateStatus(
  req: Request<{ id: string }, unknown, UpdateOrderStatusInput>,
  res: Response,
) {
  const order = await updateOrderStatus(
    Number(req.params.id),
    req.body.statusId,
    req.body.cancellationReasonId,
    req.body.cancellationNote,
  );
  res.status(200).json({ order });
}

export async function retryFinaSync(req: Request, res: Response) {
  const order = await retryOrderFinaSync(Number(req.params.id));
  res.status(200).json({ order });
}
