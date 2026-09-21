import { apiClient } from "./client";
import type { VehicleCatalogEntry } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleListingDiscount } from "./vehicle-listing-discounts";
import type { VehicleListingImage } from "./vehicle-listing-images";
import type { VehicleSpecField } from "./vehicle-category-filters";
import type { AdminFilterEntry } from "./admin-filters";

export type WarrantyUnit = "YEAR" | "MONTH";
export type VehicleListingCurrency = "GEL" | "USD";

export type VehicleListing = {
  id: number;
  // Was a 35-field inline copy of VehicleCatalogEntry, drifting silently
  // whenever a new spec field was added there (nothing forced this shape to
  // keep up) — this Omit derives it instead, so it can never fall behind.
  vehicleCatalog: Omit<VehicleCatalogEntry, "submittedBy" | "popularity" | "createdAt" | "updatedAt">;
  condition: LookupItem;
  status: LookupItem;
  color: LookupItem;
  year: number;
  mileageKm: number | null;
  warrantyValue: number | null;
  warrantyUnit: WarrantyUnit | null;
  isActive: boolean;
  // Most vehicles here are actually priced as a USD amount converted to GEL
  // at sale time using the day's National Bank of Georgia rate — see
  // useUsdToGelRate.ts and the storefront card/detail page's currency toggle.
  priceCurrency: VehicleListingCurrency;
  price: number;
  stockQuantity: number;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  images: VehicleListingImage[];
  discounts: VehicleListingDiscount[];
  // Narrower than a full VehicleListingDiscount — may be derived from a
  // rule-based bulk discount (no real DB row of its own). Only
  // discountPrice is ever read; the crossed-out original price always comes
  // from the listing's own `price`.
  activeDiscount: { discountPrice: number } | null;
  viewCount: number;
  // Admin-curated membership in the homepage's manually-curated "New
  // Arrivals" mixed slider — a plain checkbox, not computed.
  isFeaturedOnHomepage: boolean;
  // Admin-set customs-clearance status for this specific imported unit —
  // shown on the storefront and filterable on the shop grid.
  isCustomsCleared: boolean;
  createdAt: string;
  updatedAt: string;
  // Same "update-response-only" flag as ProductVariant's identical field —
  // see VehicleListingInput's previousStockQuantity.
  stockConflict?: boolean;
};

export type VehicleListingInput = {
  vehicleCatalogId: number;
  conditionId: number;
  statusId: number;
  colorId: number;
  year: number;
  mileageKm?: number | null;
  warrantyValue?: number | null;
  warrantyUnit?: WarrantyUnit | null;
  isActive?: boolean;
  priceCurrency?: VehicleListingCurrency;
  price: number;
  stockQuantity?: number;
  // Same "delta against the live DB value, not an absolute overwrite"
  // reasoning as ProductVariantInput's identical field — see
  // VehicleListingFormModal.tsx's handleSubmit.
  previousStockQuantity?: number;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  isFeaturedOnHomepage?: boolean;
  isCustomsCleared?: boolean;
};

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
  // Customer-facing shop filter — narrows to listings the admin has marked
  // as customs-cleared.
  customsCleared?: boolean;
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
      customsCleared: filters.customsCleared || undefined,
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

export type VehicleListingSaleOrder = {
  orderId: number;
  orderCode: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  lineTotal: number;
  status: string;
};

export type VehicleListingSalesSummary = {
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
  recentOrders: VehicleListingSaleOrder[];
};

// Admin-only detail — same as VehicleListing plus sales history, returned
// by the admin "full view" endpoint (see getVehicleListingDetailAdmin).
export type VehicleListingDetailAdmin = VehicleListing & {
  sales: VehicleListingSalesSummary;
};

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

export type UsdToGelExchangeRate = { rate: number | null; updatedAt: string | null };

// Public — backs the storefront's GEL⇄USD toggle (see useUsdToGelRate.ts)
// and the admin listing form's "today's rate" hint.
export async function getUsdToGelRate(): Promise<UsdToGelExchangeRate> {
  const { data } = await apiClient.get<UsdToGelExchangeRate>("/vehicle-listings/exchange-rate/usd-gel");
  return data;
}
