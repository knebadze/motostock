-- FINA push hardening (see order.prisma finaPushUncertain, order-item.prisma
-- finaProductId, product-variant.prisma finaSnapshotAt).
ALTER TABLE "dbo"."Order" ADD COLUMN "finaPushUncertain" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dbo"."OrderItem" ADD COLUMN "finaProductId" INTEGER;
ALTER TABLE "dbo"."ProductVariant" ADD COLUMN "finaSnapshotAt" TIMESTAMP(3);
