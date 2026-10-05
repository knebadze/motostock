import { apiClient } from "./client";
import type { VehicleSpecField } from "./vehicle-category-filters";
import type { AdminFilterEntry } from "./admin-filters";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type WarrantyUnit = "YEAR" | "MONTH";
export type VehicleListingCurrency = "GEL" | "USD";

export type VehicleListing = Schemas["VehicleListing"];

// Human-readable URL slug ("honda-cbr600-2020-4821") instead of a bare
// numeric id — the id is kept as a trailing suffix rather than stored as its
// own DB column, so this needs no migration and no backend change at all:
// the id is still what every lookup actually keys on (see
// parseVehicleListingIdFromSlug below), the brand/model/year prefix is purely
// cosmetic/SEO. brand.slug/model.slug (not the raw name) are reused so this
// never needs its own slugify pass or drifts from whatever normalization
// those already went through.
export function buildVehicleListingSlug(listing: {
  id: number;
  year: number;
  vehicleCatalog: { brand: { slug: string }; model: { slug: string } };
}): string {
  return `${listing.vehicleCatalog.brand.slug}-${listing.vehicleCatalog.model.slug}-${listing.year}-${listing.id}`;
}

// The inverse of buildVehicleListingSlug — reads the trailing numeric id back
// out. Also accepts a bare numeric string with no slug prefix at all, so
// every link ever shared/bookmarked before this change keeps working
// unchanged.
export function parseVehicleListingIdFromSlug(itemSlug: string): number | null {
  const match = /(\d+)$/.exec(itemSlug);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type VehicleListingInput = Schemas["CreateVehicleListingInput"];

export type VehicleSpecFilters = {
  lookupFilters?: { field: VehicleSpecField; ids: number[] }[];
  numberRanges?: { field: VehicleSpecField; min?: number; max?: number }[];
  booleanFields?: VehicleSpecField[];
};

export type VehicleListingFilters = {
  categoryId?: number;
  search?: string;
  brandIds?: number[];
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  onSale?: boolean;
  // Narrows to listings discounted as part of one BulkDiscountEvent — set by
  // the vehicle-root category page's own ?eventId= URL param (see the
  // homepage hero-slider's event-scoped DISCOUNT slides).
  bulkDiscountEventId?: number;
  // Homepage "New Arrivals" mixed slider — a plain admin-curated flag, not
  // computed from any discount/popularity data.
  featured?: boolean;
  limit?: number;
  specFilters?: VehicleSpecFilters;
  adminFilters?: AdminFilterEntry[];
  // Server-side pagination (see listVehicleListingsPage) — used by
  // VehicleListingsManager (with adminFilters) and the storefront shop page
  // (with sortBy).
  page?: number;
  pageSize?: number;
  // Storefront shop page sort — only meaningful alongside page/pageSize.
  sortBy?: "newest" | "year-desc" | "price-asc" | "price-desc";
};

function isEmptySpecFilters(filters: VehicleSpecFilters): boolean {
  return (
    !filters.lookupFilters?.length &&
    !filters.numberRanges?.length &&
    !filters.booleanFields?.length
  );
}

type VehicleListingListResponse = {
  items: VehicleListing[];
  total: number;
  page: number;
  pageSize: number;
};

async function fetchVehicleListingsList(
  filters: VehicleListingFilters,
): Promise<VehicleListingListResponse> {
  const { data } = await apiClient.get<VehicleListingListResponse>("/vehicle-listings", {
    params: {
      categoryId: filters.categoryId,
      search: filters.search || undefined,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      onSale: filters.onSale || undefined,
      bulkDiscountEventId: filters.bulkDiscountEventId,
      featured: filters.featured || undefined,
      limit: filters.limit,
      specFilters:
        filters.specFilters && !isEmptySpecFilters(filters.specFilters)
          ? JSON.stringify(filters.specFilters)
          : undefined,
      // Must distinguish "not an admin call" (key omitted — storefront
      // callers never pass this) from "admin call, no filters picked" (an
      // empty array) — see products.ts's listProducts for the full
      // reasoning (identical signal, same backend lean-projection pattern
      // in vehicle-listing.service.ts's listVehicleListings).
      adminFilters: filters.adminFilters !== undefined ? JSON.stringify(filters.adminFilters) : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
    },
  });
  return data;
}

export async function listVehicleListings(
  filters: VehicleListingFilters = {},
): Promise<VehicleListing[]> {
  const { items } = await fetchVehicleListingsList(filters);
  return items;
}

// Paginated variant of listVehicleListings — same endpoint/filters, but
// returns the full server-pagination envelope (total/page/pageSize) instead
// of a bare array. Used by VehicleListingsManager.tsx (admin, via
// adminFilters) and by the storefront shop page (via page/pageSize) — every
// OTHER caller keeps using listVehicleListings above, unaffected.
export async function listVehicleListingsPage(
  filters: VehicleListingFilters = {},
): Promise<VehicleListingListResponse> {
  return fetchVehicleListingsList(filters);
}

export async function listPopularVehicleListings(limit?: number): Promise<VehicleListing[]> {
  const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings/popular", {
    params: { limit },
  });
  return data.items;
}

export async function getVehicleListing(id: number): Promise<VehicleListing> {
  const { data } = await apiClient.get<{ item: VehicleListing }>(`/vehicle-listings/${id}`);
  return data.item;
}

export type VehicleListingSaleOrder = VehicleListingSalesSummary["recentOrders"][number];

export type VehicleListingSalesSummary = VehicleListingDetailAdmin["sales"];

// Admin-only detail — same as VehicleListing plus sales history, returned
// by the admin "full view" endpoint (see getVehicleListingDetailAdmin).
export type VehicleListingDetailAdmin = Schemas["VehicleListingDetailAdmin"];

export async function getVehicleListingDetailAdmin(id: number): Promise<VehicleListingDetailAdmin> {
  const { data } = await apiClient.get<{ item: VehicleListingDetailAdmin }>(
    `/vehicle-listings/${id}/detail`,
  );
  return data.item;
}

export async function createVehicleListing(
  input: VehicleListingInput,
): Promise<VehicleListing> {
  const { data } = await apiClient.post<{ item: VehicleListing }>("/vehicle-listings", input);
  return data.item;
}

export async function updateVehicleListing(
  id: number,
  input: Partial<VehicleListingInput>,
): Promise<VehicleListing> {
  const { data } = await apiClient.patch<{ item: VehicleListing }>(
    `/vehicle-listings/${id}`,
    input,
  );
  return data.item;
}

export async function deleteVehicleListing(id: number): Promise<void> {
  await apiClient.delete(`/vehicle-listings/${id}`);
}

export type UsdToGelExchangeRate = ApiResponse<"/vehicle-listings/exchange-rate/usd-gel", "get">;

// Public — backs the storefront's GEL⇄USD toggle (see useUsdToGelRate.ts)
// and the admin listing form's "today's rate" hint.
export async function getUsdToGelRate(): Promise<UsdToGelExchangeRate> {
  const { data } = await apiClient.get<UsdToGelExchangeRate>("/vehicle-listings/exchange-rate/usd-gel");
  return data;
}
