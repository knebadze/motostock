import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type VinDecodeResult = Schemas["VinDecodeResult"];

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const { data } = await apiClient.post<{ result: VinDecodeResult }>("/vin-decode", { vin });
  return data.result;
}
