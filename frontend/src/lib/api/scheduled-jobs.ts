import { apiClient } from "./client";
import type { ApiResponse } from "./generated-helpers";

export type ScheduledJobKey =
  | "DAILY_PRUNE_VISITOR_DATA"
  | "DAILY_PRUNE_AUTH_ARTIFACTS"
  | "DAILY_PRUNE_GUEST_PRODUCT_VIEWS"
  | "DAILY_PRUNE_GUEST_VEHICLE_LISTING_VIEWS"
  | "DAILY_PRUNE_RICH_TEXT_IMAGES"
  | "FETCH_USD_GEL_RATE"
  | "BIRTHDAY_EMAIL"
  | "DAILY_PRUNE_ERROR_LOGS"
  | "DAILY_PRUNE_GUEST_COLLECTIONS"
  | "DAILY_PRUNE_AUTH_EVENTS";

export type ScheduledJobRun = ScheduledJobRunsPage["runs"][number];

export type ScheduledJobDefinition = ApiResponse<"/scheduled-jobs", "get">["jobs"][number];

export type ScheduledJobRunsPage = ApiResponse<"/scheduled-jobs/runs", "get">;

export async function getScheduledJobs(): Promise<ScheduledJobDefinition[]> {
  const { data } = await apiClient.get<{ jobs: ScheduledJobDefinition[] }>("/scheduled-jobs");
  return data.jobs;
}

// Real server-side pagination, same as error-logs.ts's getErrorLogs —
// optionally scoped to one job's history via jobKey.
export async function getScheduledJobRuns(
  jobKey?: ScheduledJobKey,
  page = 1,
  pageSize = 20,
): Promise<ScheduledJobRunsPage> {
  const { data } = await apiClient.get<ScheduledJobRunsPage>("/scheduled-jobs/runs", {
    params: { jobKey, page, pageSize },
  });
  return data;
}

export async function triggerScheduledJob(key: ScheduledJobKey): Promise<ScheduledJobRun> {
  const { data } = await apiClient.post<{ run: ScheduledJobRun }>(`/scheduled-jobs/${key}/run`);
  return data.run;
}
