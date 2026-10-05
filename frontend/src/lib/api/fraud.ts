import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type SuspiciousLoginActivity = Schemas["SuspiciousLoginActivity"];

export async function getSuspiciousLoginActivity(): Promise<SuspiciousLoginActivity> {
  const { data } = await apiClient.get<SuspiciousLoginActivity>("/fraud/suspicious-logins");
  return data;
}
