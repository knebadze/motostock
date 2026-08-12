import { apiClient } from "./client";

export type NewsletterSubscriberStatus = "PENDING" | "CONFIRMED" | "UNSUBSCRIBED";

export type NewsletterSubscriber = {
  id: number;
  email: string;
  status: NewsletterSubscriberStatus;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

export type NewsletterSubscriberCounts = {
  pending: number;
  confirmed: number;
  unsubscribed: number;
};

export async function subscribeToNewsletter(email: string): Promise<void> {
  await apiClient.post("/newsletter/subscribe", { email });
}

export async function confirmNewsletterSubscription(token: string): Promise<void> {
  await apiClient.post("/newsletter/confirm", { token });
}

export async function unsubscribeFromNewsletter(token: string): Promise<void> {
  await apiClient.post("/newsletter/unsubscribe", { token });
}

export async function listNewsletterSubscribers(filters: {
  status?: NewsletterSubscriberStatus;
  search?: string;
} = {}): Promise<NewsletterSubscriber[]> {
  const { data } = await apiClient.get<{ items: NewsletterSubscriber[] }>("/newsletter/subscribers", {
    params: filters,
  });
  return data.items;
}

export async function getNewsletterSubscriberCounts(): Promise<NewsletterSubscriberCounts> {
  const { data } = await apiClient.get<NewsletterSubscriberCounts>("/newsletter/subscribers/counts");
  return data;
}

export async function deleteNewsletterSubscriber(id: number): Promise<void> {
  await apiClient.delete(`/newsletter/subscribers/${id}`);
}
