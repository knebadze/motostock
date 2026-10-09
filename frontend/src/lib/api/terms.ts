import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type Terms = Schemas["TermsAndConditions"];

export type UpdateTermsInput = Schemas["UpdateTermsInput"];

export async function getTerms(): Promise<Terms> {
  const { data } = await apiClient.get<{ terms: Terms }>("/terms");
  return data.terms;
}

export async function updateTerms(input: UpdateTermsInput): Promise<Terms> {
  const { data } = await apiClient.patch<{ terms: Terms }>("/terms", input);
  return data.terms;
}
