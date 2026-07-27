-- AlterTable
ALTER TABLE "dbo"."VehicleCatalog" ADD COLUMN "variant" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCatalog_modelId_variant_yearFrom_yearTo_key" ON "dbo"."VehicleCatalog"("modelId", "variant", "yearFrom", "yearTo");
