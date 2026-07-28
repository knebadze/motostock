-- AlterTable
ALTER TABLE "dbo"."ProductVariant" ADD COLUMN "finaId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_finaId_key" ON "dbo"."ProductVariant"("finaId");

-- CreateEnum
CREATE TYPE "dbo"."FinaSyncTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "dbo"."FinaSyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "dbo"."FinaSyncRun" (
    "id" SERIAL NOT NULL,
    "trigger" "dbo"."FinaSyncTrigger" NOT NULL,
    "status" "dbo"."FinaSyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "variantsChecked" INTEGER NOT NULL DEFAULT 0,
    "variantsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredById" INTEGER,

    CONSTRAINT "FinaSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinaSyncRun_startedAt_idx" ON "dbo"."FinaSyncRun"("startedAt");

-- CreateIndex
CREATE INDEX "FinaSyncRun_triggeredById_idx" ON "dbo"."FinaSyncRun"("triggeredById");

-- AddForeignKey
ALTER TABLE "dbo"."FinaSyncRun" ADD CONSTRAINT "FinaSyncRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
