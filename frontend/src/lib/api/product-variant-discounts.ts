import { createDiscountCollectionApi } from "./collection-discount-api";
import type { CollectionDiscountInput } from "./collection-discount-api";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ProductVariantDiscount = Schemas["ProductVariantDiscount"];
export type ProductVariantDiscountInput = CollectionDiscountInput;

const productVariantDiscountsApi = createDiscountCollectionApi<ProductVariantDiscount>(
  (variantId) => `/product-variants/${variantId}/discounts`,
);

export const listProductVariantDiscounts = productVariantDiscountsApi.list;
export const createProductVariantDiscount = productVariantDiscountsApi.create;
export const deleteProductVariantDiscount = productVariantDiscountsApi.remove;
