import "server-only";
import { cache } from "react";
import { ADMIN_LIST_INITIAL_PAGE_SIZE, type AdminListPage, EMPTY_ADMIN_LIST_PAGE, fetchFromServer } from "./core";
import { SHOP_PAGE_SIZE } from "./products";
import type { BrandModelRef } from "../vehicle-catalog";
import type { VehicleListing } from "../vehicle-listings";

// Vehicle-listing reads (storefront listings, facets, homepage sliders, admin list).

export const getVehicleListingsFromServer = cache(async (
  categoryId?: number,
  bulkDiscountEventId?: number,
): Promise<VehicleListing[]> => {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: { categoryId, bulkDiscountEventId },
    fallback: [],
    extract: (data) => data.items,
  });
});

// VehicleShopPage.tsx's brand-checkbox facet list — a dedicated lean
// endpoint (one ref row per brand) rather than an unbounded
// getVehicleListingsFromServer call used only to re-derive this same
// distinct-brand list client-side (same fix as getShopCategoryFacetsFromServer
// above, applied to the per-category vehicle shop page's brand facet).
export const getVehicleBrandFacetsFromServer = cache(async (
  categoryId?: number,
  bulkDiscountEventId?: number,
): Promise<BrandModelRef[]> => {
  return fetchFromServer<{ items: BrandModelRef[] }, BrandModelRef[]>("/vehicle-listings/brand-facets", {
    params: { categoryId, bulkDiscountEventId },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Vehicle category shop page's initial (server-rendered) load specifically —
// same reasoning as getProductsPageFromServer above (unlike
// getVehicleListingsFromServer, this sends page/pageSize/sortBy for real
// server-side pagination/sorting instead of an unbounded fetch).
// VehicleShopPage.tsx re-fetches subsequent pages/sorts itself via
// listVehicleListingsPage.
export const getVehicleListingsPageFromServer = cache(async (
  categoryId: number,
  page: number,
  sortBy: "newest" | "year-desc" | "price-asc" | "price-desc",
  bulkDiscountEventId?: number,
): Promise<AdminListPage<VehicleListing>> => {
  return fetchFromServer<AdminListPage<VehicleListing>, AdminListPage<VehicleListing>>(
    "/vehicle-listings",
    {
      params: { categoryId, page, pageSize: SHOP_PAGE_SIZE, sortBy, bulkDiscountEventId },
      fallback: { items: [], total: 0, page: 1, pageSize: SHOP_PAGE_SIZE },
      extract: (data) => data,
    },
  );
});

// Admin vehicle-listings list's initial (server-rendered) load specifically
// — see getAdminProductsFromServer's identical reasoning: an explicit
// `adminFilters=[]`, not an omitted param, is what gets the backend's lean
// admin-list projection from the very first render. Fetches only page 1 —
// VehicleListingsManager.tsx re-fetches subsequent pages itself.
export const getAdminVehicleListingsFromServer = cache(async (): Promise<AdminListPage<VehicleListing>> => {
  return fetchFromServer<AdminListPage<VehicleListing>, AdminListPage<VehicleListing>>(
    "/vehicle-listings",
    {
      params: { adminFilters: "[]", page: 1, pageSize: ADMIN_LIST_INITIAL_PAGE_SIZE },
      fallback: EMPTY_ADMIN_LIST_PAGE,
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getVehicleListingFromServer = cache(async (id: number): Promise<VehicleListing | null> => {
  // Public endpoint (guest vehicle detail page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: VehicleListing }, VehicleListing | null>(
    `/vehicle-listings/${id}`,
    { fallback: null, extract: (data) => data.item },
  );
});

// Homepage "discounted vehicles" slider.
export const getOnSaleVehicleListingsFromServer = cache(async (limit: number): Promise<VehicleListing[]> => {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: { onSale: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "New Arrivals" mixed slider (FEATURED_MIXED) — a plain
// admin-curated flag, not a discount/popularity computation.
export const getFeaturedVehicleListingsFromServer = cache(async (limit: number): Promise<VehicleListing[]> => {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: { featured: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "popular vehicles" slider.
export const getPopularVehicleListingsFromServer = cache(async (limit: number): Promise<VehicleListing[]> => {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings/popular", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
});
