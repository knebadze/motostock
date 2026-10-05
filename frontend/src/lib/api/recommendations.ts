import { apiClient } from "./client";
import type { ProductListItem } from "./products";

// Algorithmic "similar products" — same category, ranked by shared fitment
// overlap with the anchor product.
export async function listSimilarProducts(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number } = {},
): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<{ items: ProductListItem[] }>(
    `/products/${productId}/recommendations/similar`,
    { params: options },
  );
  return data.items;
}

// Algorithmic "frequently bought together" (co-purchase counts) — distinct
// from the admin-curated buyTogether embedded in ProductDetail.
export async function listFrequentlyBoughtTogether(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number } = {},
): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<{ items: ProductListItem[] }>(
    `/products/${productId}/recommendations/frequently-bought-together`,
    { params: options },
  );
  return data.items;
}

// Algorithmic "customers who viewed this also viewed" (view-based
// co-occurrence) — a fallback fetched independently of buyTogether/FBT.
export async function listViewedTogether(
  productId: number,
  options: { vehicleCatalogId?: number; limit?: number } = {},
): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<{ items: ProductListItem[] }>(
    `/products/${productId}/recommendations/viewed-together`,
    { params: options },
  );
  return data.items;
}

// Homepage "popular for your vehicle" section.
export async function listPopularForVehicle(
  vehicleCatalogId: number,
  limit?: number,
): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<{ items: ProductListItem[] }>("/recommendations/popular-for-vehicle", {
    params: { vehicleCatalogId, limit },
  });
  return data.items;
}

// Homepage "recommended for you" section — requires auth; the caller
// (getRecommendedForMeFromServer) is expected to skip the call entirely for
// guests rather than let it 401.
export async function listRecommendedForMe(limit?: number): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<{ items: ProductListItem[] }>("/recommendations/for-me", {
    params: { limit },
  });
  return data.items;
}
