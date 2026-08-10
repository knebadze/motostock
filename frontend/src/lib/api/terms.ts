import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type Terms = {
  id: number;
  content: LocalizedString;
  updatedAt: string;
};

export type UpdateTermsInput = {
  content: LocalizedString;
};

export async function getTerms(): Promise<Terms> {
  const { data } = await apiClient.get<{ terms: Terms }>("/terms");
  return data.terms;
}

export async function updateTerms(input: UpdateTermsInput): Promise<Terms> {
  const { data } = await apiClient.patch<{ terms: Terms }>("/terms", input);
  return data.terms;
}
