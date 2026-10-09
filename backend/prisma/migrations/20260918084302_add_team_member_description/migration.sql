-- DropIndex
DROP INDEX "dbo"."Session_lastSeenAt_idx";

-- DropIndex
DROP INDEX "dbo"."VehicleCatalog_modelId_variant_yearFrom_yearTo_key";

-- AlterTable
ALTER TABLE "dbo"."TeamMember" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionKa" TEXT,
ADD COLUMN     "descriptionRu" TEXT;

-- CreateIndex
CREATE INDEX "Session_lastSeenAt_idx" ON "dbo"."Session"("lastSeenAt");
