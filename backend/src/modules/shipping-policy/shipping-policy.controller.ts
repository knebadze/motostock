import type { Request, Response } from "express";
import * as shippingPolicyService from "./shipping-policy.service.js";
import type { UpdateShippingPolicyInput } from "./shipping-policy.schema.js";

export async function getOne(_req: Request, res: Response) {
  const shippingPolicy = await shippingPolicyService.getShippingPolicy();
  res.status(200).json({ shippingPolicy });
}

export async function update(
  req: Request<unknown, unknown, UpdateShippingPolicyInput>,
  res: Response,
) {
  const shippingPolicy = await shippingPolicyService.updateShippingPolicy(req.body);
  res.status(200).json({ shippingPolicy });
}
