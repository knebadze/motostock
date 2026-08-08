import { apiClient } from "./client";

export type CacheEntry = { key: string; valuePreview: string };

export async function listCache(): Promise<{ entries: CacheEntry[]; count: number }> {
  const { data } = await apiClient.get<{ entries: CacheEntry[]; count: number }>("/cache");
  return data;
}

export async function clearCache(): Promise<void> {
  await apiClient.post("/cache/clear");
}
