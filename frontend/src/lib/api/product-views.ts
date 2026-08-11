import { apiClient } from "./client";
import type { Product } from "./products";

// The caller's own recently viewed products — works for guests too via the
// shared guest-id cookie (see the backend's resolveProductViewOwner).
export async function listRecentlyViewed(limit?: number): Promise<Product[]> {
  const { data } = await apiClient.get<{ items: Product[] }>("/users/me/recently-viewed", {
    params: { limit },
  });
  return data.items;
}
