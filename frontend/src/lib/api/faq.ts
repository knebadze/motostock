import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type Faq = Schemas["Faq"];

export type FaqInput = Schemas["CreateFaqInput"];

export async function listFaqs(): Promise<Faq[]> {
  const { data } = await apiClient.get<{ items: Faq[] }>("/faq");
  return data.items;
}

export async function listPublicFaqs(): Promise<Faq[]> {
  const { data } = await apiClient.get<{ items: Faq[] }>("/faq/public");
  return data.items;
}

export async function createFaq(input: FaqInput): Promise<Faq> {
  const { data } = await apiClient.post<{ item: Faq }>("/faq", input);
  return data.item;
}

export async function updateFaq(id: number, input: Partial<FaqInput>): Promise<Faq> {
  const { data } = await apiClient.patch<{ item: Faq }>(`/faq/${id}`, input);
  return data.item;
}

export async function reorderFaqs(ids: number[]): Promise<Faq[]> {
  const { data } = await apiClient.put<{ items: Faq[] }>("/faq/order", { ids });
  return data.items;
}

export async function deleteFaq(id: number): Promise<void> {
  await apiClient.delete(`/faq/${id}`);
}
