-- FINA order-push outbox (see order.prisma's FinaOrderSyncStatus.PENDING)
-- and the fields stock sync needs to account for orders FINA hasn't
-- recorded yet (see fina-sync.repository.ts's applyFinaAvailability).
ALTER TYPE "dbo"."FinaOrderSyncStatus" ADD VALUE 'PENDING';

ALTER TABLE "dbo"."Order"
  ADD COLUMN "finaPushAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "finaPushLockedUntil" TIMESTAMP(3),
  ADD COLUMN "finaSaleSyncedAt" TIMESTAMP(3),
  ADD COLUMN "finaReturnSyncedAt" TIMESTAMP(3),
  ADD COLUMN "finaLastError" TEXT;

CREATE INDEX "Order_finaSyncStatus_idx" ON "dbo"."Order"("finaSyncStatus");
CREATE INDEX "Order_finaSaleSyncedAt_idx" ON "dbo"."Order"("finaSaleSyncedAt");
CREATE INDEX "Order_finaReturnSyncedAt_idx" ON "dbo"."Order"("finaReturnSyncedAt");
