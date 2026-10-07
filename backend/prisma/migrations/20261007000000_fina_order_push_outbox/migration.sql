-- FINA order-push outbox (see order.prisma's FinaOrderSyncStatus.PENDING).
ALTER TYPE "dbo"."FinaOrderSyncStatus" ADD VALUE 'PENDING';

ALTER TABLE "dbo"."Order"
  ADD COLUMN "finaPushAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "finaPushLockedUntil" TIMESTAMP(3);

CREATE INDEX "Order_finaSyncStatus_idx" ON "dbo"."Order"("finaSyncStatus");
