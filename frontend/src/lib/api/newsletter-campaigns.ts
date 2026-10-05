import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type NewsletterCampaignStatus = "DRAFT" | "SENDING" | "SENT" | "FAILED";

export type NewsletterCampaign = Schemas["NewsletterCampaign"];

export type NewsletterCampaignInput = Schemas["CreateNewsletterCampaignInput"];

export async function listNewsletterCampaigns(): Promise<NewsletterCampaign[]> {
  const { data } = await apiClient.get<{ items: NewsletterCampaign[] }>("/newsletter-campaigns");
  return data.items;
}

export async function createNewsletterCampaign(
  input: NewsletterCampaignInput,
): Promise<NewsletterCampaign> {
  const { data } = await apiClient.post<{ item: NewsletterCampaign }>("/newsletter-campaigns", input);
  return data.item;
}

export async function updateNewsletterCampaign(
  id: number,
  input: NewsletterCampaignInput,
): Promise<NewsletterCampaign> {
  const { data } = await apiClient.patch<{ item: NewsletterCampaign }>(
    `/newsletter-campaigns/${id}`,
    input,
  );
  return data.item;
}

export async function deleteNewsletterCampaign(id: number): Promise<void> {
  await apiClient.delete(`/newsletter-campaigns/${id}`);
}

export async function sendNewsletterCampaign(id: number): Promise<NewsletterCampaign> {
  const { data } = await apiClient.post<{ item: NewsletterCampaign }>(
    `/newsletter-campaigns/${id}/send`,
  );
  return data.item;
}

// Copies a campaign's subject/body into a new DRAFT, regardless of the
// source's status — the way to "resend" a SENT/FAILED campaign (e.g. the
// same discount announcement with updated dates) without touching the
// original's history.
export async function duplicateNewsletterCampaign(id: number): Promise<NewsletterCampaign> {
  const { data } = await apiClient.post<{ item: NewsletterCampaign }>(
    `/newsletter-campaigns/${id}/duplicate`,
  );
  return data.item;
}
