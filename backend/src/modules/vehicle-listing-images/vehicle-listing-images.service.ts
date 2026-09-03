import { ApiError } from "../../lib/ApiError.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { vehicleListingImagesRepository } from "./vehicle-listing-images.repository.js";
import type { ReorderVehicleListingImagesInput } from "./vehicle-listing-images.schema.js";

type ImageRow = { id: number; imageUrl: string; position: number };

export function toImageResponse(row: ImageRow) {
  return { id: row.id, imageUrl: row.imageUrl, position: row.position };
}

async function assertListingExists(vehicleListingId: number) {
  const listing = await vehicleListingRepository.findById(vehicleListingId);
  if (!listing) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა");
  }
}

export async function listImages(vehicleListingId: number) {
  await assertListingExists(vehicleListingId);
  const rows = await vehicleListingImagesRepository.findMany(vehicleListingId);
  return rows.map(toImageResponse);
}

export async function uploadImages(vehicleListingId: number, files: Express.Multer.File[]) {
  await assertListingExists(vehicleListingId);

  const { _max } = await vehicleListingImagesRepository.maxPosition(vehicleListingId);
  let nextPosition = (_max.position ?? -1) + 1;

  const uploadedUrls = await Promise.all(
    files.map((file) => saveUploadedImage("vehicle-listing", file)),
  );

  await vehicleListingImagesRepository.createMany(
    uploadedUrls.map((imageUrl) => ({
      vehicleListingId,
      imageUrl,
      position: nextPosition++,
    })),
  );

  return listImages(vehicleListingId);
}

export async function reorderImages(
  vehicleListingId: number,
  input: ReorderVehicleListingImagesInput,
) {
  await assertListingExists(vehicleListingId);

  const existing = await vehicleListingImagesRepository.findMany(vehicleListingId);
  const existingIds = new Set(existing.map((image) => image.id));

  if (
    input.imageIds.length !== existing.length ||
    !input.imageIds.every((id) => existingIds.has(id))
  ) {
    throw new ApiError(400, "მითითებული სურათების სია არ ემთხვევა ამ განცხადების სურათებს");
  }

  await Promise.all(
    input.imageIds.map((id, index) => vehicleListingImagesRepository.updatePosition(id, index)),
  );

  return listImages(vehicleListingId);
}

export async function deleteImage(vehicleListingId: number, imageId: number) {
  const existing = await vehicleListingImagesRepository.findById(imageId);
  if (!existing || existing.vehicleListingId !== vehicleListingId) {
    throw new ApiError(404, "სურათი ვერ მოიძებნა");
  }

  await vehicleListingImagesRepository.delete(imageId);
  void deleteUploadedImage(existing.imageUrl);
}
