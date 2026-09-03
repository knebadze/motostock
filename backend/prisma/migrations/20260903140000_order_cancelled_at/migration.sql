-- AlterTable
ALTER TABLE "dbo"."Order" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Backfill: for orders already CANCELLED, updatedAt is the best available
-- approximation of when that happened (the flawed assumption the old
-- analytics queries made) — better to seed existing rows with it than leave
-- them permanently missing from cancellation analytics going forward.
UPDATE "dbo"."Order" o
SET "cancelledAt" = o."updatedAt"
FROM "cla"."OrderStatus" s
WHERE o."statusId" = s."id" AND s."key" = 'CANCELLED';

-- CreateIndex
CREATE INDEX "Order_cancelledAt_idx" ON "dbo"."Order"("cancelledAt");
