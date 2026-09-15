import { apiClient } from "./client";

export type CollectionDiscountBase = {
  id: number;
  discountPrice: number;
  discountPercent: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

export type CollectionDiscountInput = {
  discountPrice: number;
  discountPercent?: number | null;
  startDate: string;
  endDate: string;
};

// Shared by product-variant-discounts.ts and vehicle-listing-discounts.ts,
// whose list/create/delete discount API used to be implemented twice,
// identical apart from the URL base and the parent-FK field name embedded
// in each domain's own discount type (productVariantId vs
// vehicleListingId) — TDiscount lets each caller keep that field typed
// correctly while sharing the actual HTTP calls.
export function createDiscountCollectionApi<TDiscount extends CollectionDiscountBase>(
  basePath: (parentId: number) => string,
) {
  async function list(parentId: number): Promise<TDiscount[]> {
    const { data } = await apiClient.get<{ items: TDiscount[] }>(basePath(parentId));
    return data.items;
  }

  async function create(parentId: number, input: CollectionDiscountInput): Promise<TDiscount> {
    const { data } = await apiClient.post<{ item: TDiscount }>(basePath(parentId), input);
    return data.item;
  }

  async function remove(parentId: number, id: number): Promise<void> {
    await apiClient.delete(`${basePath(parentId)}/${id}`);
  }

  return { list, create, remove };
}
