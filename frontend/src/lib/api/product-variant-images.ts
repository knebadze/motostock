import { createImageCollectionApi } from "./collection-image-api";
import type { CollectionImage } from "./collection-image-api";

export type ProductVariantImage = CollectionImage;

const productVariantImagesApi = createImageCollectionApi(
  (variantId) => `/product-variants/${variantId}/images`,
);

export const listProductVariantImages = productVariantImagesApi.list;
export const uploadProductVariantImages = productVariantImagesApi.upload;
export const reorderProductVariantImages = productVariantImagesApi.reorder;
export const deleteProductVariantImage = productVariantImagesApi.remove;
