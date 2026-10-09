import { errorLogsRepository } from "./error-logs.repository.js";

// ErrorLog had no retention at all — only the admin's manual "clear all" —
// so the table grew forever. 30 days is long enough to investigate anything
// an admin actually noticed, and the daily DAILY_PRUNE_ERROR_LOGS job (see
// scheduled-jobs.registry.ts) keeps it bounded from there.
const ERROR_LOG_RETENTION_DAYS = 30;

export async function pruneOldErrorLogs(): Promise<number> {
  const cutoff = new Date(Date.now() - ERROR_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return errorLogsRepository.deleteCreatedBefore(cutoff);
}
