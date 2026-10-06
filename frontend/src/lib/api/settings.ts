import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type VinDecodeProvider = "nhtsa" | "vincario";

export type Settings = Schemas["Settings"];

export async function getSettings(): Promise<Settings> {
  const { data } = await apiClient.get<{ settings: Settings }>("/settings");
  return data.settings;
}

export async function updateSettings(input: Settings): Promise<Settings> {
  const { data } = await apiClient.patch<{ settings: Settings }>("/settings", input);
  return data.settings;
}

// Admin Monitoring tab — whether SENTRY_DSN exists on the backend.
export type MonitoringStatus = Schemas["MonitoringStatus"];

export async function getMonitoringStatus(): Promise<MonitoringStatus> {
  const { data } = await apiClient.get<MonitoringStatus>("/settings/monitoring-status");
  return data;
}

// Sends a test event from the backend to Sentry.
export async function sendSentryTestEvent(): Promise<void> {
  await apiClient.post("/settings/monitoring/test-sentry");
}
