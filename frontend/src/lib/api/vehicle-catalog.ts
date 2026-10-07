import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { AdminFilterEntry } from "./admin-filters";
import type { components } from "./generated/schema";
import { slugify } from "../categories-tree";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type NamedRef = {
  id: number;
  name: LocalizedString;
  slug: string;
};

// Brand/Model names are locale-invariant (not per-language translated), so
// they're plain strings unlike Category/ProductBrand's NamedRef.
export type BrandModelRef = {
  id: number;
  name: string;
  slug: string;
};

export type VehicleCatalogEntry = Schemas["VehicleCatalog"];
// The lean picker shape (GET /vehicle-catalog/options) — everything a "pick a
// vehicle" UI reads, without the 30+ spec columns of a full entry.
export type VehicleCatalogOption = Schemas["VehicleCatalogOption"];

export type VehicleCatalogInput = Schemas["CreateVehicleCatalogInput"];

// URL slug for a vehicle's "parts that fit" page (/compatible-products/…):
// "honda-cbr600rr-2007-2012-123" — brand, model, variant, years, then the
// catalog id, which is all parseVehicleCatalogIdFromSlug reads back (same
// trailing-id scheme as vehicle listings' buildVehicleListingSlug), so a
// renamed brand/model only changes the slug, never breaks the page.
export function buildVehicleCatalogSlug(entry: {
  id: number;
  brand: { slug: string };
  model: { slug: string };
  variant: string;
  yearFrom: number | null;
  yearTo: number | null;
}): string {
  const parts = [entry.brand.slug, entry.model.slug, slugify(entry.variant)];
  if (entry.yearFrom != null) parts.push(String(entry.yearFrom));
  if (entry.yearTo != null && entry.yearTo !== entry.yearFrom) parts.push(String(entry.yearTo));
  parts.push(String(entry.id));
  return parts.filter(Boolean).join("-");
}

// Inverse of buildVehicleCatalogSlug — the trailing number. Also accepts the
// old bare-id URLs (/compatible-products/123), which the page then
// 301-redirects to the slugged form.
export function parseVehicleCatalogIdFromSlug(slug: string): number | null {
  const match = /(\d+)$/.exec(slug);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type SubmitVehicleCatalogInput = Schemas["SubmitVehicleCatalogInput"];

export type GarageVehicle = Schemas["GarageVehicle"];

export async function submitVehicleCatalogEntry(
  input: SubmitVehicleCatalogInput,
): Promise<GarageVehicle> {
  const { data } = await apiClient.post<{ item: GarageVehicle }>(
    "/vehicle-catalog/submit",
    input,
  );
  return data.item;
}

export type VehicleCatalogPage = {
  items: VehicleCatalogEntry[];
  total: number;
  page: number;
  pageSize: number;
};

// Real server-side pagination (skip/take), unlike most other admin lists —
// only used by the admin catalog list screen, which always sends page and
// pageSize; the many full-list consumers of GET /vehicle-catalog (fitment
// pickers, garage, homepage, ...) go through getVehicleCatalogFromServer
// instead and never send these, so they keep getting every row.
export async function listVehicleCatalog(
  adminFilters: AdminFilterEntry[] = [],
  page = 1,
  pageSize = 20,
): Promise<VehicleCatalogPage> {
  const { data } = await apiClient.get<VehicleCatalogPage>("/vehicle-catalog", {
    params: {
      adminFilters: adminFilters.length ? JSON.stringify(adminFilters) : undefined,
      page,
      pageSize,
    },
  });
  return data;
}

export async function createVehicleCatalogEntry(
  input: VehicleCatalogInput,
): Promise<VehicleCatalogEntry> {
  const { data } = await apiClient.post<{ item: VehicleCatalogEntry }>(
    "/vehicle-catalog",
    input,
  );
  return data.item;
}

export async function updateVehicleCatalogEntry(
  id: number,
  input: Partial<VehicleCatalogInput>,
): Promise<VehicleCatalogEntry> {
  const { data } = await apiClient.patch<{ item: VehicleCatalogEntry }>(
    `/vehicle-catalog/${id}`,
    input,
  );
  return data.item;
}

export async function deleteVehicleCatalogEntry(id: number): Promise<void> {
  await apiClient.delete(`/vehicle-catalog/${id}`);
}

export type BulkImportRowResult = BulkImportVehicleCatalogResult["results"][number];

export type BulkImportVehicleCatalogResult = Schemas["BulkImportVehicleCatalogResult"];

export async function downloadVehicleCatalogTemplate(): Promise<void> {
  const { data } = await apiClient.get<Blob>("/vehicle-catalog/bulk-import/template", {
    responseType: "blob",
  });

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vehicle-catalog-template.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function bulkImportVehicleCatalog(
  file: File,
): Promise<BulkImportVehicleCatalogResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<BulkImportVehicleCatalogResult>(
    "/vehicle-catalog/bulk-import",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function uploadVehicleCatalogImage(
  id: number,
  file: File,
): Promise<VehicleCatalogEntry> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: VehicleCatalogEntry }>(
    `/vehicle-catalog/${id}/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.item;
}
