import { apiClient } from "./client";

export type NewsletterCampaignStatus = "DRAFT" | "SENDING" | "SENT" | "FAILED";

export type NewsletterCampaign = {
  id: number;
  subject: string;
  body: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterCampaignInput = {
  subject: string;
  body: string;
};

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
