import type { Request, Response } from "express";
import * as vehicleListingDiscountsService from "./vehicle-listing-discounts.service.js";
import type {
  CreateVehicleListingDiscountInput,
  UpdateVehicleListingDiscountInput,
} from "./vehicle-listing-discounts.schema.js";

export async function list(req: Request<{ listingId: string }>, res: Response) {
  const items = await vehicleListingDiscountsService.listDiscounts(
    Number(req.params.listingId),
  );
  res.status(200).json({ items });
}

export async function create(
  req: Request<{ listingId: string }, unknown, CreateVehicleListingDiscountInput>,
  res: Response,
) {
  const item = await vehicleListingDiscountsService.createDiscount(
    Number(req.params.listingId),
    req.body,
  );
  res.status(201).json({ item });
}

export async function update(
  req: Request<{ listingId: string; id: string }, unknown, UpdateVehicleListingDiscountInput>,
  res: Response,
) {
  const item = await vehicleListingDiscountsService.updateDiscount(
    Number(req.params.listingId),
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({ item });
}

export async function remove(
  req: Request<{ listingId: string; id: string }>,
  res: Response,
) {
  await vehicleListingDiscountsService.deleteDiscount(
    Number(req.params.listingId),
    Number(req.params.id),
  );
  res.status(204).send();
}
