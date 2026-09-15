import { createDiscountCollectionApi } from "./collection-discount-api";
import type { CollectionDiscountBase, CollectionDiscountInput } from "./collection-discount-api";

export type ProductVariantDiscount = CollectionDiscountBase & { productVariantId: number };
export type ProductVariantDiscountInput = CollectionDiscountInput;

const productVariantDiscountsApi = createDiscountCollectionApi<ProductVariantDiscount>(
  (variantId) => `/product-variants/${variantId}/discounts`,
);

export const listProductVariantDiscounts = productVariantDiscountsApi.list;
export const createProductVariantDiscount = productVariantDiscountsApi.create;
export const deleteProductVariantDiscount = productVariantDiscountsApi.remove;
