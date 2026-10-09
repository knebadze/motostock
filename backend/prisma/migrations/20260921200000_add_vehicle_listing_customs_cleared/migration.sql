-- AlterTable
ALTER TABLE "dbo"."VehicleListing" ADD COLUMN     "isCustomsCleared" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "VehicleListing_isCustomsCleared_idx" ON "dbo"."VehicleListing"("isCustomsCleared");
