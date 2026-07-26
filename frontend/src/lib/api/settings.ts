import { apiClient } from "./client";

export type Settings = {
  useCloudStorage: boolean;
};

export async function getSettings(): Promise<Settings> {
  const { data } = await apiClient.get<{ settings: Settings }>("/settings");
  return data.settings;
}

export async function updateSettings(input: Settings): Promise<Settings> {
  const { data } = await apiClient.patch<{ settings: Settings }>("/settings", input);
  return data.settings;
}
