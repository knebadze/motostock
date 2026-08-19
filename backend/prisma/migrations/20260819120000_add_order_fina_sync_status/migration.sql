-- CreateEnum
CREATE TYPE "dbo"."FinaOrderSyncStatus" AS ENUM ('NOT_APPLICABLE', 'SYNCED', 'FAILED');

-- AlterTable
ALTER TABLE "dbo"."Order" ADD COLUMN "finaSyncStatus" "dbo"."FinaOrderSyncStatus" NOT NULL DEFAULT 'NOT_APPLICABLE';
