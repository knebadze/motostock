-- Two more daily retention jobs (see scheduled-jobs.registry.ts).
ALTER TYPE "dbo"."ScheduledJobKey" ADD VALUE 'DAILY_PRUNE_GUEST_COLLECTIONS';
ALTER TYPE "dbo"."ScheduledJobKey" ADD VALUE 'DAILY_PRUNE_AUTH_EVENTS';
