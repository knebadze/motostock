import "server-only";
import { cache } from "react";
import { ADMIN_LIST_INITIAL_PAGE_SIZE, type AdminListPage, EMPTY_ADMIN_LIST_PAGE, fetchFromServer } from "./core";
import type { BrandModelRef, NamedRef } from "../vehicle-catalog";
import type { Product, ProductListItem, ProductDetail } from "../products";

// Storefront and admin product reads, including recommendations and shop listing pages.

export const getProductsFromServer = cache(async (
  categoryId?: number,
  vehicleCatalogId?: number,
): Promise<ProductListItem[]> => {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>("/products", {
    params: { categoryId: categoryId || undefined, vehicleCatalogId: vehicleCatalogId || undefined },
    fallback: [],
    extract: (data) => data.items,
  });
});

// ProductShopPage.tsx's brand-checkbox facet list — a dedicated lean
// endpoint (one ref row per brand) rather than an unbounded
// getProductsFromServer(category.id) call used only to re-derive this same
// distinct-brand list client-side (same fix as getShopCategoryFacetsFromServer
// above, applied to the per-category product shop page's brand facet).
export const getProductBrandFacetsFromServer = cache(async (
  categoryId?: number,
): Promise<BrandModelRef[]> => {
  return fetchFromServer<{ items: BrandModelRef[] }, BrandModelRef[]>("/products/brand-facets", {
    params: { categoryId },
    fallback: [],
    extract: (data) => data.items,
  });
});

export const SHOP_PAGE_SIZE = 20;

// Category shop page's initial (server-rendered) load specifically — unlike
// getProductsFromServer above (shared with sitemap/admin pickers/etc., which
// need the full unbounded list), this sends page/pageSize/sortBy so the
// backend does real server-side pagination and sorting (see
// products.service.ts's listProducts) instead of the page shipping the
// whole category's catalog to the browser to sort/paginate itself.
// ProductShopPage.tsx re-fetches subsequent pages/sorts itself via
// listProductsPage.
export const getProductsPageFromServer = cache(async (
  categoryId: number,
  page: number,
  sortBy: "newest" | "price-asc" | "price-desc",
  vehicleCatalogId?: number,
): Promise<AdminListPage<ProductListItem>> => {
  return fetchFromServer<AdminListPage<ProductListItem>, AdminListPage<ProductListItem>>("/products", {
    params: { categoryId, vehicleCatalogId, page, pageSize: SHOP_PAGE_SIZE, sortBy },
    fallback: { items: [], total: 0, page: 1, pageSize: SHOP_PAGE_SIZE },
    extract: (data) => data,
  });
});

// /compatible-products/… page's first server-rendered page — every
// category, newest first; CompatibleProductsPage.tsx fetches further
// pages/filters/sorts itself (listProductsPage), like the /shop page.
export const getCompatibleProductsPageFromServer = cache(async (
  vehicleCatalogId: number,
): Promise<AdminListPage<ProductListItem>> => {
  return fetchFromServer<AdminListPage<ProductListItem>, AdminListPage<ProductListItem>>("/products", {
    params: { vehicleCatalogId, page: 1, pageSize: SHOP_PAGE_SIZE, sortBy: "newest" },
    fallback: { items: [], total: 0, page: 1, pageSize: SHOP_PAGE_SIZE },
    extract: (data) => data,
  });
});

// Admin products list's initial (server-rendered) load specifically —
// unlike getProductsFromServer above (shared with the storefront/sitemap/
// admin pickers, which need the full card-rendering shape), this always
// sends `adminFilters=[]` explicitly so the backend takes the lean
// admin-list projection from the very first render, not just once the admin
// panel's client-side refresh() kicks in after picking a filter (see
// products.service.ts's listProducts and lib/api/products.ts's listProducts
// for why an explicit `[]`, not an omitted param, is what signals this).
// Fetches only page 1 — ProductsManager.tsx re-fetches subsequent pages.
export const getAdminProductsFromServer = cache(async (): Promise<AdminListPage<ProductListItem>> => {
  return fetchFromServer<AdminListPage<ProductListItem>, AdminListPage<ProductListItem>>("/products", {
    params: { adminFilters: "[]", page: 1, pageSize: ADMIN_LIST_INITIAL_PAGE_SIZE },
    fallback: EMPTY_ADMIN_LIST_PAGE,
    extract: (data) => data,
    requireAuth: true,
  });
});

// Homepage "discounted products" slider.
export const getOnSaleProductsFromServer = cache(async (limit: number): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>("/products", {
    params: { onSale: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "New Arrivals" mixed slider (FEATURED_MIXED) — a plain
// admin-curated flag, not a discount/popularity computation.
export const getFeaturedProductsFromServer = cache(async (limit: number): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>("/products", {
    params: { featured: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "popular products" slider.
export const getPopularProductsFromServer = cache(async (limit: number): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>("/products/popular", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

const getCachedProductDetail = cache(async (slug: string, vehicleCatalogId: string): Promise<ProductDetail | null> => {
  // Public endpoint (guest product view page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: ProductDetail }, ProductDetail | null>(`/products/by-slug/${slug}`, {
    params: { vehicleCatalogId: vehicleCatalogId || undefined },
    fallback: null,
    extract: (data) => data.item,
  });
});

// The product page calls this twice per request — generateMetadata and the
// page body — and the backend's by-slug endpoint is NOT a pure read: it
// increments Product.viewCount and records a product view. React cache()
// keys on the exact argument list, so `(slug)` and `(slug, undefined)` were
// two different entries — every page view ran the heavy detail query twice
// and counted as two views, doubling popularity/analytics. Normalizing to a
// fixed two-argument key here makes both calls hit the same cache entry
// (callers must still pass the same vehicleCatalogId — see the page's
// generateMetadata).
export function getProductDetailFromServer(slug: string, vehicleCatalogId?: string): Promise<ProductDetail | null> {
  return getCachedProductDetail(slug, vehicleCatalogId ?? "");
}

// Product detail page's "similar products" section — replaces the old
// naive "everything else in the same category" slice with the algorithmic,
// fitment-overlap-ranked list (see recommendations.service.ts).
export const getSimilarProductsFromServer = cache(async (
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>(
    `/products/${productId}/recommendations/similar`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
});

// Product detail page's algorithmic "frequently bought together" — a
// fallback shown when the admin hasn't curated a buyTogether list for this
// product (see FrequentlyBoughtTogether.tsx).
export const getFrequentlyBoughtTogetherFromServer = cache(async (
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>(
    `/products/${productId}/recommendations/frequently-bought-together`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
});

// Product detail page's algorithmic "customers who viewed this also
// viewed" — view-based co-occurrence, independent of buyTogether/FBT.
export const getViewedTogetherFromServer = cache(async (
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>(
    `/products/${productId}/recommendations/viewed-together`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
});

// Homepage "recently viewed" section (RECENTLY_VIEWED) — works for guests
// too (the backend always resolves an owner, minting a guest-id cookie if
// needed), unlike getRecommendedForMeFromServer's auth-only gate.
export const getRecentlyViewedFromServer = cache(async (limit?: number): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>("/users/me/recently-viewed", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "popular for your vehicle" section (POPULAR_FOR_VEHICLE) — the
// caller skips this entirely when there's no SELECTED_VEHICLE_COOKIE, same
// as it does for getProductDetailFromServer's vehicleCatalogId.
export const getPopularForVehicleFromServer = cache(async (
  vehicleCatalogId: string,
  limit?: number,
): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>("/recommendations/popular-for-vehicle", {
    params: { vehicleCatalogId, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "recommended for you" section (RECOMMENDED_FOR_YOU) — auth-gated
// like getMyGarageFromServer; guests never even reach the API call.
export const getRecommendedForMeFromServer = cache(async (limit?: number): Promise<ProductListItem[]> => {
  return fetchFromServer<{ items: ProductListItem[] }, ProductListItem[]>("/recommendations/for-me", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getProductFromServer = cache(async (id: number): Promise<Product | null> => {
  return fetchFromServer<{ item: Product }, Product | null>(`/products/${id}`, {
    fallback: null,
    extract: (data) => data.item,
    requireAuth: true,
  });
});

// /shop page's category-checkbox facet list — the distinct categories among
// products matching these filters. A dedicated lean endpoint (one ref row
// per category) rather than the unbounded full-product-row fetch this used
// to be (getShopProductsFromServer, now removed): that fetch shipped every
// matching product's full card data (3-locale descriptions, metaTitle,
// attributeValues, ...) purely to re-derive this same distinct-category list
// client-side.
export const getShopCategoryFacetsFromServer = cache(async (filters: {
  categoryId?: number;
  vehicleCatalogId?: number;
  brandIds?: number[];
  onSale?: boolean;
  bulkDiscountEventId?: number;
}): Promise<NamedRef[]> => {
  // Public endpoint (the /shop page) — must not bail out just because there
  // is no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: NamedRef[] }, NamedRef[]>("/products/category-facets", {
    params: {
      categoryId: filters.categoryId,
      vehicleCatalogId: filters.vehicleCatalogId,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      onSale: filters.onSale || undefined,
      bulkDiscountEventId: filters.bulkDiscountEventId,
    },
    fallback: [],
    extract: (data) => data.items,
  });
});

// /shop page's initial (server-rendered) grid load specifically — real
// server-side pagination/sorting (see products.service.ts's listProducts).
// ShopAllProductsPage.tsx re-fetches subsequent pages/filters/sorts itself
// via listProductsPage.
export const getShopProductsPageFromServer = cache(async (filters: {
  categoryId?: number;
  brandIds?: number[];
  onSale?: boolean;
  bulkDiscountEventId?: number;
}): Promise<AdminListPage<ProductListItem>> => {
  return fetchFromServer<AdminListPage<ProductListItem>, AdminListPage<ProductListItem>>("/products", {
    params: {
      categoryId: filters.categoryId,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      onSale: filters.onSale || undefined,
      bulkDiscountEventId: filters.bulkDiscountEventId,
      page: 1,
      pageSize: SHOP_PAGE_SIZE,
      sortBy: "newest",
    },
    fallback: { items: [], total: 0, page: 1, pageSize: SHOP_PAGE_SIZE },
    extract: (data) => data,
  });
});
