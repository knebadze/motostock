import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "./client";
import type { User } from "./auth";
import type { Category } from "./categories";
import type { Settings } from "./settings";
import type { Brand } from "./brands";
import type { Model } from "./models";
import type { LookupItem } from "./lookups";
import type { LookupTypeSlug } from "@/config/lookup-types";
import type { VehicleCatalogEntry } from "./vehicle-catalog";
import type { VehicleListing } from "./vehicle-listings";
import type { Attribute } from "./attributes";
import type { ProductBrand } from "./product-brands";
import type { Product } from "./products";
import type { FinaSyncRun } from "./fina-sync";
import type { AdminUser } from "./users";

async function authHeaders() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader ? { Cookie: cookieHeader } : undefined;
}

export async function getCurrentUserFromServer(): Promise<User | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  try {
    const { data } = await apiClient.get<{ user: User }>("/users/me", { headers });
    return data.user;
  } catch {
    return null;
  }
}

export async function getCategoriesFromServer(): Promise<Category[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ categories: Category[] }>("/categories", {
      headers,
    });
    return data.categories;
  } catch {
    return [];
  }
}

export async function getSettingsFromServer(): Promise<Settings> {
  const headers = await authHeaders();
  const fallback: Settings = { useCloudStorage: false };
  if (!headers) return fallback;

  try {
    const { data } = await apiClient.get<{ settings: Settings }>("/settings", {
      headers,
    });
    return data.settings;
  } catch {
    return fallback;
  }
}

export async function getUsersFromServer(): Promise<AdminUser[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ users: AdminUser[] }>("/users", { headers });
    return data.users;
  } catch {
    return [];
  }
}

export async function getFinaSyncRunsFromServer(): Promise<FinaSyncRun[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ runs: FinaSyncRun[] }>("/fina-sync/runs", {
      headers,
    });
    return data.runs;
  } catch {
    return [];
  }
}

export async function getBrandsFromServer(): Promise<Brand[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ brands: Brand[] }>("/brands", { headers });
    return data.brands;
  } catch {
    return [];
  }
}

export async function getModelsFromServer(): Promise<Model[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ models: Model[] }>("/models", { headers });
    return data.models;
  } catch {
    return [];
  }
}

export async function getLookupItemsFromServer(type: LookupTypeSlug): Promise<LookupItem[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: LookupItem[] }>(`/lookups/${type}`, {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getVehicleCatalogFromServer(): Promise<VehicleCatalogEntry[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: VehicleCatalogEntry[] }>("/vehicle-catalog", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getVehicleListingsFromServer(): Promise<VehicleListing[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getAttributesFromServer(): Promise<Attribute[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: Attribute[] }>("/attributes", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductBrandsFromServer(): Promise<ProductBrand[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: ProductBrand[] }>("/product-brands", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductsFromServer(): Promise<Product[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/products", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductFromServer(id: number): Promise<Product | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  try {
    const { data } = await apiClient.get<{ item: Product }>(`/products/${id}`, { headers });
    return data.item;
  } catch {
    return null;
  }
}
