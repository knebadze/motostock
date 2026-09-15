import { getScheduledJobsFromServer, getScheduledJobRunsFromServer, getFinaSyncRunsFromServer } from "@/lib/api/server";
import { ScheduledJobsManager } from "@/components/admin/scheduled-jobs/ScheduledJobsManager";

export default async function ScheduledJobsPage() {
  const [jobs, runs, finaSyncRuns] = await Promise.all([
    getScheduledJobsFromServer(),
    getScheduledJobRunsFromServer(),
    getFinaSyncRunsFromServer(),
  ]);

  return (
    <ScheduledJobsManager initialJobs={jobs} initialRuns={runs} latestFinaSyncRun={finaSyncRuns[0] ?? null} />
  );
}
