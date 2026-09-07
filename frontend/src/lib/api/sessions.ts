import { apiClient } from "./client";
import type { PagedResult } from "@/components/shared/Pagination";

export type Session = {
  id: number;
  user: { id: number; name: string; email: string };
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
};

// Real server-side pagination (skip/take) — same pattern as
// listNewsletterSubscribers. Returns the shared PagedResult<T> shape
// (Pagination.tsx) directly since the backend's {items,total,page,pageSize}
// envelope already matches it exactly.
export async function listSessions(filters: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedResult<Session>> {
  const { data } = await apiClient.get<PagedResult<Session>>("/sessions", { params: filters });
  return data;
}

export async function revokeSession(id: number): Promise<void> {
  await apiClient.delete(`/sessions/${id}`);
}
