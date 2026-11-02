-- Monthly prune of successful scheduled-job runs.
ALTER TYPE "dbo"."ScheduledJobKey" ADD VALUE 'MONTHLY_PRUNE_SUCCESSFUL_JOB_RUNS';
