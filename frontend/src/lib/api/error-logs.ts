import { apiClient } from "./client";

// Backend persists every logger.error(...) call here (see backend's
// lib/logger.ts pino hook) — not just request errors, but background/
// best-effort failures (FINA push, guest-cart merge, mail send...) that
// would otherwise only ever show up in `docker compose logs`.
export type ErrorLog = {
  id: number;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
};

export type ErrorLogsPage = {
  logs: ErrorLog[];
  total: number;
  page: number;
  pageSize: number;
};

// Real server-side pagination (skip/take), not the client-side slicing most
// other admin lists use — this table has no natural cap the way a category
// or brand list does, so fetching it all up front doesn't scale.
export async function getErrorLogs(page = 1, pageSize = 25): Promise<ErrorLogsPage> {
  const { data } = await apiClient.get<ErrorLogsPage>("/error-logs", { params: { page, pageSize } });
  return data;
}

export async function clearErrorLogs(): Promise<void> {
  await apiClient.post("/error-logs/clear");
}
