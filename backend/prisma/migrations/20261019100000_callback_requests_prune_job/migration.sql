-- Daily retention prune for handled "call me back" requests.
ALTER TYPE "dbo"."ScheduledJobKey" ADD VALUE 'DAILY_PRUNE_CALLBACK_REQUESTS';
