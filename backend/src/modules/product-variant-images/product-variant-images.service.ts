import { ApiError } from "../../lib/ApiError.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { productVariantsRepository } from "../product-variants/product-variants.repository.js";
import { productVariantImagesRepository } from "./product-variant-images.repository.js";
import type { ReorderProductVariantImagesInput } from "./product-variant-images.schema.js";

type ImageRow = { id: number; imageUrl: string; position: number };

export function toImageResponse(row: ImageRow) {
  return { id: row.id, imageUrl: row.imageUrl, position: row.position };
}

async function assertVariantExists(productVariantId: number) {
  const variant = await productVariantsRepository.findById(productVariantId);
  if (!variant) {
    throw new ApiError(404, "ვარიანტი ვერ მოიძებნა");
  }
}

export async function listImages(productVariantId: number) {
  await assertVariantExists(productVariantId);
  const rows = await productVariantImagesRepository.findMany(productVariantId);
  return rows.map(toImageResponse);
}

export async function uploadImages(productVariantId: number, files: Express.Multer.File[]) {
  await assertVariantExists(productVariantId);

  const { _max } = await productVariantImagesRepository.maxPosition(productVariantId);
  let nextPosition = (_max.position ?? -1) + 1;

  const uploadedUrls = await Promise.all(
    files.map((file) => saveUploadedImage("product-variant", file)),
  );

  await productVariantImagesRepository.createMany(
    uploadedUrls.map((imageUrl) => ({
      productVariantId,
      imageUrl,
      position: nextPosition++,
    })),
  );

  return listImages(productVariantId);
}

export async function reorderImages(
  productVariantId: number,
  input: ReorderProductVariantImagesInput,
) {
  await assertVariantExists(productVariantId);

  const existing = await productVariantImagesRepository.findMany(productVariantId);
  const existingIds = new Set(existing.map((image) => image.id));

  if (
    input.imageIds.length !== existing.length ||
    !input.imageIds.every((id) => existingIds.has(id))
  ) {
    throw new ApiError(400, "მითითებული სურათების სია არ ემთხვევა ამ ვარიანტის სურათებს");
  }

  await Promise.all(
    input.imageIds.map((id, index) => productVariantImagesRepository.updatePosition(id, index)),
  );

  return listImages(productVariantId);
}

export async function deleteImage(productVariantId: number, imageId: number) {
  const existing = await productVariantImagesRepository.findById(imageId);
  if (!existing || existing.productVariantId !== productVariantId) {
    throw new ApiError(404, "სურათი ვერ მოიძებნა");
  }

  await productVariantImagesRepository.delete(imageId);
  void deleteUploadedImage(existing.imageUrl);
}
