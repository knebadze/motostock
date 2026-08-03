import { apiClient } from "./client";

export async function clearCache(): Promise<void> {
  await apiClient.post("/cache/clear");
}
