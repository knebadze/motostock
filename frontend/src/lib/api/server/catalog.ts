import "server-only";
import { cache } from "react";
import { fetchFromServer } from "./core";
import type { Brand } from "../brands";
import type { Model } from "../models";
import type { LookupItem } from "../lookups";
import type { LookupTypeSlug } from "@/config/lookup-types";
import type { VehicleCatalogEntry, VehicleCatalogPage } from "../vehicle-catalog";
import type { Attribute } from "../attributes";
import type { CategoryFilter } from "../category-filters";
import type { VehicleCategoryFilter } from "../vehicle-category-filters";
import type { ProductBrand } from "../product-brands";
import type { Unit } from "../units";

// Catalog reference data: vehicle brands/models/catalog, lookups, attributes, product brands, units, category filters.

export const getBrandsFromServer = cache(async (): Promise<Brand[]> => {
  return fetchFromServer<{ brands: Brand[] }, Brand[]>("/brands", {
    fallback: [],
    extract: (data) => data.brands,
    requireAuth: true,
  });
});

export const getModelsFromServer = cache(async (): Promise<Model[]> => {
  return fetchFromServer<{ models: Model[] }, Model[]>("/models", {
    fallback: [],
    extract: (data) => data.models,
    requireAuth: true,
  });
});

export const getLookupItemsFromServer = cache(async (type: LookupTypeSlug): Promise<LookupItem[]> => {
  // Public endpoint (guest-facing forms, e.g. the address form's city
  // dropdown, read this too) — must not bail out just because there's no
  // admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: LookupItem[] }, LookupItem[]>(`/lookups/${type}`, {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getVehicleCatalogFromServer = cache(async (): Promise<VehicleCatalogEntry[]> => {
  // Public endpoint (garage "pick from catalog" flow reads this too) — must
  // not bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleCatalogEntry[] }, VehicleCatalogEntry[]>("/vehicle-catalog", {
    fallback: [],
    extract: (data) => data.items,
  });
});

// Paginated variant for the admin catalog list screen's initial load —
// distinct from getVehicleCatalogFromServer above, which every other page
// (fitment pickers, garage, homepage, ...) still uses to fetch every row.
export const getVehicleCatalogPageFromServer = cache(async (
  page = 1,
  pageSize = 20,
): Promise<VehicleCatalogPage> => {
  return fetchFromServer<VehicleCatalogPage, VehicleCatalogPage>("/vehicle-catalog", {
    params: { page, pageSize },
    fallback: { items: [], total: 0, page, pageSize },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getVehicleCatalogEntryFromServer = cache(async (
  id: number,
): Promise<VehicleCatalogEntry | null> => {
  // Public endpoint (the garage's "compatible products" page reads this by
  // id) — must not bail out just because there's no admin session cookie,
  // same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: VehicleCatalogEntry }, VehicleCatalogEntry | null>(
    `/vehicle-catalog/${id}`,
    { fallback: null, extract: (data) => data.item },
  );
});

export const getCategoryFiltersFromServer = cache(async (categoryId: number): Promise<CategoryFilter[]> => {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: CategoryFilter[] }, CategoryFilter[]>("/category-filters", {
    params: { categoryId },
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getVehicleCategoryFiltersFromServer = cache(async (
  categoryId: number,
): Promise<VehicleCategoryFilter[]> => {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleCategoryFilter[] }, VehicleCategoryFilter[]>(
    "/vehicle-category-filters",
    { params: { categoryId }, fallback: [], extract: (data) => data.items },
  );
});

export const getAttributesFromServer = cache(async (): Promise<Attribute[]> => {
  return fetchFromServer<{ items: Attribute[] }, Attribute[]>("/attributes", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getProductBrandsFromServer = cache(async (): Promise<ProductBrand[]> => {
  return fetchFromServer<{ items: ProductBrand[] }, ProductBrand[]>("/product-brands", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getUnitsFromServer = cache(async (): Promise<Unit[]> => {
  return fetchFromServer<{ items: Unit[] }, Unit[]>("/units", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});
