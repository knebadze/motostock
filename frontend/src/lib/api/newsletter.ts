import { apiClient } from "./client";
import type { PagedResult } from "@/components/shared/Pagination";

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

// "NOT_SUBSCRIBED" (not one of NewsletterSubscriberStatus's DB values) means
// this account's email has no NewsletterSubscriber row at all — the common
// case for an account that's never touched the newsletter.
export type MyNewsletterStatus = "NOT_SUBSCRIBED" | NewsletterSubscriberStatus;

// Account-page toggle (see AccountNewsletterCard.tsx) — always acts on the
// logged-in session's own email, resolved server-side; no email/token param
// here, unlike the public subscribe/unsubscribe functions above.
export async function getMyNewsletterStatus(): Promise<MyNewsletterStatus> {
  const { data } = await apiClient.get<{ status: MyNewsletterStatus }>("/newsletter/my-status");
  return data.status;
}

export async function subscribeMeToNewsletter(): Promise<void> {
  await apiClient.post("/newsletter/my-subscribe");
}

export async function unsubscribeMeFromNewsletter(): Promise<void> {
  await apiClient.post("/newsletter/my-unsubscribe");
}

export async function confirmNewsletterSubscription(token: string): Promise<void> {
  await apiClient.post("/newsletter/confirm", { token });
}

export async function unsubscribeFromNewsletter(token: string): Promise<void> {
  await apiClient.post("/newsletter/unsubscribe", { token });
}

// Real server-side pagination (skip/take) — same pattern as listUsers.
// Returns the shared PagedResult<T> shape (Pagination.tsx) directly rather
// than a one-off local type, since the backend's {items,total,page,pageSize}
// envelope already matches it exactly.
export async function listNewsletterSubscribers(filters: {
  status?: NewsletterSubscriberStatus;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedResult<NewsletterSubscriber>> {
  const { data } = await apiClient.get<PagedResult<NewsletterSubscriber>>("/newsletter/subscribers", {
    params: filters,
  });
  return data;
}

export async function getNewsletterSubscriberCounts(): Promise<NewsletterSubscriberCounts> {
  const { data } = await apiClient.get<NewsletterSubscriberCounts>("/newsletter/subscribers/counts");
  return data;
}

export async function deleteNewsletterSubscriber(id: number): Promise<void> {
  await apiClient.delete(`/newsletter/subscribers/${id}`);
}
