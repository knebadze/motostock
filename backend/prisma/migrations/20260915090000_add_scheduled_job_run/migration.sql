-- CreateEnum
CREATE TYPE "dbo"."ScheduledJobKey" AS ENUM ('DAILY_PRUNE_VISITOR_DATA', 'DAILY_PRUNE_AUTH_ARTIFACTS', 'DAILY_PRUNE_GUEST_PRODUCT_VIEWS', 'DAILY_PRUNE_GUEST_VEHICLE_LISTING_VIEWS', 'DAILY_PRUNE_RICH_TEXT_IMAGES');

-- CreateEnum
CREATE TYPE "dbo"."ScheduledJobTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "dbo"."ScheduledJobStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "dbo"."ScheduledJobRun" (
    "id" SERIAL NOT NULL,
    "jobKey" "dbo"."ScheduledJobKey" NOT NULL,
    "trigger" "dbo"."ScheduledJobTrigger" NOT NULL,
    "status" "dbo"."ScheduledJobStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsAffected" INTEGER,
    "detail" JSONB,
    "errorMessage" TEXT,
    "triggeredById" INTEGER,

    CONSTRAINT "ScheduledJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledJobRun_jobKey_startedAt_idx" ON "dbo"."ScheduledJobRun"("jobKey", "startedAt");

-- CreateIndex
CREATE INDEX "ScheduledJobRun_triggeredById_idx" ON "dbo"."ScheduledJobRun"("triggeredById");

-- AddForeignKey
ALTER TABLE "dbo"."ScheduledJobRun" ADD CONSTRAINT "ScheduledJobRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
