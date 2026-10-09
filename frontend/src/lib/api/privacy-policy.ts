import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type PrivacyPolicy = Schemas["PrivacyPolicy"];

export type UpdatePrivacyPolicyInput = Schemas["UpdatePrivacyPolicyInput"];

export async function getPrivacyPolicy(): Promise<PrivacyPolicy> {
  const { data } = await apiClient.get<{ privacyPolicy: PrivacyPolicy }>("/privacy-policy");
  return data.privacyPolicy;
}

export async function updatePrivacyPolicy(input: UpdatePrivacyPolicyInput): Promise<PrivacyPolicy> {
  const { data } = await apiClient.patch<{ privacyPolicy: PrivacyPolicy }>("/privacy-policy", input);
  return data.privacyPolicy;
}
