import "server-only";
import { cache } from "react";
import { fetchFromServer } from "./core";
import type { Brand } from "../brands";
import type { Model } from "../models";
import type { LookupItem } from "../lookups";
import type { LookupTypeSlug } from "@/config/lookup-types";
import type { VehicleCatalogEntry, VehicleCatalogOption, VehicleCatalogPage } from "../vehicle-catalog";
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

export const getVehicleCatalogFromServer = cache(async (): Promise<VehicleCatalogOption[]> => {
  // Public endpoint (garage "pick from catalog" flow reads this too) — must
  // not bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleCatalogOption[] }, VehicleCatalogOption[]>("/vehicle-catalog/options", {
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

// Sitemap feeds — just the URL parts + lastModified of every listable
// product / active vehicle listing (the backend's /products/sitemap and
// /vehicle-listings/sitemap), not full card rows of the whole catalog.
export type ProductSitemapEntry = { slug: string; updatedAt: string; category: { slug: string } };
export type VehicleListingSitemapEntry = {
  id: number;
  year: number;
  updatedAt: string;
  vehicleCatalog: { brand: { slug: string }; model: { slug: string }; category: { slug: string } };
};

export const getProductSitemapEntriesFromServer = cache(async (): Promise<ProductSitemapEntry[]> => {
  return fetchFromServer<{ items: ProductSitemapEntry[] }, ProductSitemapEntry[]>("/products/sitemap", {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getVehicleListingSitemapEntriesFromServer = cache(async (): Promise<VehicleListingSitemapEntry[]> => {
  return fetchFromServer<{ items: VehicleListingSitemapEntry[] }, VehicleListingSitemapEntry[]>(
    "/vehicle-listings/sitemap",
    { fallback: [], extract: (data) => data.items },
  );
});

// Sitemap feed — catalog entries at least one active product fits (the
// "parts for <vehicle>" pages worth indexing).
export const getVehicleCatalogOptionsWithCompatibleProductsFromServer = cache(
  async (): Promise<VehicleCatalogOption[]> => {
    return fetchFromServer<{ items: VehicleCatalogOption[] }, VehicleCatalogOption[]>(
      "/vehicle-catalog/options/with-compatible-products",
      { fallback: [], extract: (data) => data.items },
    );
  },
);

// Asked only after a slug lookup missed: the current URL parts of a product
// / category that used to have `slug` (renamed by an admin), so the page can
// 301 instead of 404. null = not a known old slug.
export const getProductSlugRedirectFromServer = cache(
  async (slug: string): Promise<{ slug: string; categorySlug: string } | null> => {
    return fetchFromServer<{ slug: string; categorySlug: string }, { slug: string; categorySlug: string } | null>(
      `/slug-redirects/products/${encodeURIComponent(slug)}`,
      { fallback: null, extract: (data) => data },
    );
  },
);

export const getCategorySlugRedirectFromServer = cache(async (slug: string): Promise<{ slug: string } | null> => {
  return fetchFromServer<{ slug: string }, { slug: string } | null>(
    `/slug-redirects/categories/${encodeURIComponent(slug)}`,
    { fallback: null, extract: (data) => data },
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
