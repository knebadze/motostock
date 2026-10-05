import { apiClient } from "./client";
import type { ProductListItem } from "./products";

// The caller's own recently viewed products — works for guests too via the
// shared guest-id cookie (see the backend's resolveProductViewOwner).
export async function listRecentlyViewed(limit?: number): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<{ items: ProductListItem[] }>("/users/me/recently-viewed", {
    params: { limit },
  });
  return data.items;
}
