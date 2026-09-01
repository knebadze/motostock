import { apiClient } from "./client";

// expiresAt is epoch ms, or null for a permanent entry (cleared only
// explicitly, on a write or the admin "clear cache" action below).
export type CacheEntry = { key: string; valuePreview: string; expiresAt: number | null };

export async function listCache(): Promise<{ entries: CacheEntry[]; count: number }> {
  const { data } = await apiClient.get<{ entries: CacheEntry[]; count: number }>("/cache");
  return data;
}

export async function clearCache(): Promise<void> {
  await apiClient.post("/cache/clear");
}
