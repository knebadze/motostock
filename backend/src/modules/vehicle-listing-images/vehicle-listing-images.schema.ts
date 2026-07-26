import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const vehicleListingImageListingIdParamSchema = z.object({
  listingId: z.coerce.number().int().positive(),
});

export const vehicleListingImageIdParamSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
});

export const reorderVehicleListingImagesSchema = registry.register(
  "ReorderVehicleListingImagesInput",
  z.object({
    imageIds: z.array(z.int().positive()).min(1),
  }),
);
export type ReorderVehicleListingImagesInput = z.infer<
  typeof reorderVehicleListingImagesSchema
>;

export const vehicleListingImageResponseSchema = registry.register(
  "VehicleListingImage",
  z.object({
    id: z.int().openapi({ example: 1 }),
    imageUrl: z.string(),
    position: z.int(),
  }),
);
