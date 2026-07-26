import type { Request, Response } from "express";
import { ApiError } from "../../lib/ApiError.js";
import * as vehicleListingImagesService from "./vehicle-listing-images.service.js";
import type { ReorderVehicleListingImagesInput } from "./vehicle-listing-images.schema.js";

export async function list(req: Request<{ listingId: string }>, res: Response) {
  const items = await vehicleListingImagesService.listImages(Number(req.params.listingId));
  res.status(200).json({ items });
}

export async function upload(req: Request<{ listingId: string }>, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw new ApiError(400, "სურათი არ არის მიბმული");
  }

  const items = await vehicleListingImagesService.uploadImages(
    Number(req.params.listingId),
    files,
  );
  res.status(201).json({ items });
}

export async function reorder(
  req: Request<{ listingId: string }, unknown, ReorderVehicleListingImagesInput>,
  res: Response,
) {
  const items = await vehicleListingImagesService.reorderImages(
    Number(req.params.listingId),
    req.body,
  );
  res.status(200).json({ items });
}

export async function remove(
  req: Request<{ listingId: string; imageId: string }>,
  res: Response,
) {
  await vehicleListingImagesService.deleteImage(
    Number(req.params.listingId),
    Number(req.params.imageId),
  );
  res.status(204).send();
}
