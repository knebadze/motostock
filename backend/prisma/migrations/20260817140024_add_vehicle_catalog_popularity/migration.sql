-- AlterTable
ALTER TABLE "dbo"."VehicleCatalog" ADD COLUMN     "popularity" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "VehicleCatalog_popularity_idx" ON "dbo"."VehicleCatalog"("popularity");
