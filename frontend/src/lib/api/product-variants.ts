import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { LookupItem } from "./lookups";
import type { ProductVariantDiscount } from "./product-variant-discounts";
import type { ProductVariantImage } from "./product-variant-images";

export type ProductVariant = {
  id: number;
  product: { id: number; name: LocalizedString };
  sku: string | null;
  finaId: number | null;
  size: LookupItem | null;
  color: LookupItem | null;
  price: number;
  stockQuantity: number;
  condition: LookupItem | null;
  status: LookupItem | null;
  isActive: boolean;
  images: ProductVariantImage[];
  discounts: ProductVariantDiscount[];
  activeDiscount: ProductVariantDiscount | null;
  createdAt: string;
  updatedAt: string;
  // Only ever present in an update response, and only when stockQuantity
  // was part of the request — see ProductVariantInput's previousStockQuantity.
  stockConflict?: boolean;
};

export type ProductVariantInput = {
  productId: number;
  sku?: string | null;
  finaId?: number | null;
  sizeId?: number | null;
  colorId?: number | null;
  price: number;
  stockQuantity?: number;
  // The stockQuantity this variant had when the admin's edit form was
  // populated — required alongside stockQuantity on an update so the
  // backend can apply it as a delta against whatever's actually in the DB
  // now instead of an absolute overwrite that could silently undo a
  // concurrent order's stock change. Omit both fields together if stock
  // wasn't touched (see ProductVariantsPanel.tsx's handleSaveEdit).
  previousStockQuantity?: number;
  conditionId?: number | null;
  statusId?: number | null;
  isActive?: boolean;
};

export async function listProductVariants(productId?: number): Promise<ProductVariant[]> {
  const { data } = await apiClient.get<{ items: ProductVariant[] }>("/product-variants", {
    params: productId ? { productId } : undefined,
  });
  return data.items;
}

export async function createProductVariant(input: ProductVariantInput): Promise<ProductVariant> {
  const { data } = await apiClient.post<{ item: ProductVariant }>("/product-variants", input);
  return data.item;
}

export async function updateProductVariant(
  id: number,
  input: Partial<ProductVariantInput>,
): Promise<ProductVariant> {
  const { data } = await apiClient.patch<{ item: ProductVariant }>(
    `/product-variants/${id}`,
    input,
  );
  return data.item;
}

export async function deleteProductVariant(id: number): Promise<void> {
  await apiClient.delete(`/product-variants/${id}`);
}
