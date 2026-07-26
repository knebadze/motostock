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
