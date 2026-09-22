import { apiClient } from "./client";

export type ScheduledJobKey =
  | "DAILY_PRUNE_VISITOR_DATA"
  | "DAILY_PRUNE_AUTH_ARTIFACTS"
  | "DAILY_PRUNE_GUEST_PRODUCT_VIEWS"
  | "DAILY_PRUNE_GUEST_VEHICLE_LISTING_VIEWS"
  | "DAILY_PRUNE_RICH_TEXT_IMAGES"
  | "FETCH_USD_GEL_RATE"
  | "BIRTHDAY_EMAIL";

export type ScheduledJobRun = {
  id: number;
  jobKey: ScheduledJobKey;
  trigger: "SCHEDULED" | "MANUAL";
  // RUNNING is a run still in progress or, if it never got resolved, one
  // that crashed before finishing (finishedAt stays null either way) — same
  // convention as FinaSyncRun's own RUNNING status.
  status: "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  itemsAffected: number | null;
  // Per-category breakdown for jobs that delete from more than one table
  // (e.g. {presenceDeleted, visitsDeleted}) — itemsAffected is their sum.
  // string values cover non-count detail (FETCH_USD_GEL_RATE's fetchedAt,
  // BIRTHDAY_EMAIL's skipped flag).
  detail: Record<string, number | string> | null;
  errorMessage: string | null;
  triggeredBy: { id: number; name: string } | null;
};

export type ScheduledJobDefinition = {
  key: ScheduledJobKey;
  labelKa: string;
  // Derived server-side straight from the job's own cron expression (see
  // backend's formatCronScheduleLabel) — never a second hand-typed schedule
  // string, so it can't drift from what actually runs.
  scheduleLabelKa: string;
  lastRun: ScheduledJobRun | null;
};

export type ScheduledJobRunsPage = {
  runs: ScheduledJobRun[];
  total: number;
  page: number;
  pageSize: number;
};

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
