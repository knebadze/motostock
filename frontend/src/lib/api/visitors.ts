import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type VisitorOverview = Schemas["VisitorOverview"];

// Public, no auth — fire-and-forget heartbeat (see VisitorPingBeacon.tsx),
// works for both logged-in users and guests via the shared guest-id cookie.
export async function pingVisitor(): Promise<void> {
  await apiClient.post("/visitors/ping");
}

export async function getVisitorOverview(): Promise<VisitorOverview> {
  const { data } = await apiClient.get<VisitorOverview>("/visitors/overview");
  return data;
}
