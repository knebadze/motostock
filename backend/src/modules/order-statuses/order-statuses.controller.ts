import type { Request, Response } from "express";
import * as orderStatusesService from "./order-statuses.service.js";
import type { CreateOrderStatusInput, UpdateOrderStatusItemInput } from "./order-statuses.schema.js";

export async function list(_req: Request, res: Response) {
  const items = await orderStatusesService.listOrderStatuses();
  res.status(200).json({ items });
}

export async function create(req: Request<unknown, unknown, CreateOrderStatusInput>, res: Response) {
  const item = await orderStatusesService.createOrderStatus(req.body);
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ id: string }, unknown, UpdateOrderStatusItemInput>,
  res: Response,
) {
  const item = await orderStatusesService.updateOrderStatus(Number(req.params.id), req.body);
  res.status(200).json({ item });
}

export async function remove(req: Request, res: Response) {
  await orderStatusesService.deleteOrderStatus(Number(req.params.id));
  res.status(204).send();
}
