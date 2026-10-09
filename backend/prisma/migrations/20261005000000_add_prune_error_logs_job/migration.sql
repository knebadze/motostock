-- New daily retention job for ErrorLog (see error-logs.service.ts).
ALTER TYPE "dbo"."ScheduledJobKey" ADD VALUE 'DAILY_PRUNE_ERROR_LOGS';
