import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ShippingPolicy = Schemas["ShippingPolicy"];

export type UpdateShippingPolicyInput = Schemas["UpdateShippingPolicyInput"];

export async function getShippingPolicy(): Promise<ShippingPolicy> {
  const { data } = await apiClient.get<{ shippingPolicy: ShippingPolicy }>("/shipping-policy");
  return data.shippingPolicy;
}

export async function updateShippingPolicy(input: UpdateShippingPolicyInput): Promise<ShippingPolicy> {
  const { data } = await apiClient.patch<{ shippingPolicy: ShippingPolicy }>("/shipping-policy", input);
  return data.shippingPolicy;
}
