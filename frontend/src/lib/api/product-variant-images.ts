import { createImageCollectionApi } from "./collection-image-api";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ProductVariantImage = Schemas["ProductVariantImage"];

const productVariantImagesApi = createImageCollectionApi(
  (variantId) => `/product-variants/${variantId}/images`,
);

export const listProductVariantImages = productVariantImagesApi.list;
export const uploadProductVariantImages = productVariantImagesApi.upload;
export const reorderProductVariantImages = productVariantImagesApi.reorder;
export const deleteProductVariantImage = productVariantImagesApi.remove;
