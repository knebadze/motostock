import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "./client";
import type { User } from "./auth";
import type { Category } from "./categories";
import type { Settings } from "./settings";

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
