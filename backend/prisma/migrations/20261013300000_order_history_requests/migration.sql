-- Order status timeline + customer cancel/return requests.

ALTER TYPE "dbo"."EmailTemplateKey" ADD VALUE 'ORDER_REQUEST_ADMIN';

CREATE TYPE "dbo"."OrderRequestType" AS ENUM ('CANCEL', 'RETURN');
CREATE TYPE "dbo"."OrderRequestStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "dbo"."OrderStatusHistory" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "changedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_idx" ON "dbo"."OrderStatusHistory"("orderId");
CREATE INDEX "OrderStatusHistory_statusId_idx" ON "dbo"."OrderStatusHistory"("statusId");
CREATE INDEX "OrderStatusHistory_changedByUserId_idx" ON "dbo"."OrderStatusHistory"("changedByUserId");

ALTER TABLE "dbo"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "dbo"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dbo"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_statusId_fkey"
    FOREIGN KEY ("statusId") REFERENCES "cla"."OrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dbo"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey"
    FOREIGN KEY ("changedByUserId") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "dbo"."OrderRequest" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "type" "dbo"."OrderRequestType" NOT NULL,
    "status" "dbo"."OrderRequestStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderRequest_orderId_idx" ON "dbo"."OrderRequest"("orderId");
CREATE INDEX "OrderRequest_status_createdAt_idx" ON "dbo"."OrderRequest"("status", "createdAt");
CREATE INDEX "OrderRequest_resolvedByUserId_idx" ON "dbo"."OrderRequest"("resolvedByUserId");
-- At most one open request of each type per order (not expressible in the
-- Prisma schema).
CREATE UNIQUE INDEX "OrderRequest_open_order_type_key" ON "dbo"."OrderRequest"("orderId", "type") WHERE "status" = 'OPEN';

ALTER TABLE "dbo"."OrderRequest" ADD CONSTRAINT "OrderRequest_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "dbo"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dbo"."OrderRequest" ADD CONSTRAINT "OrderRequest_resolvedByUserId_fkey"
    FOREIGN KEY ("resolvedByUserId") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill. An order starts as PENDING or (FINA-confirmed at checkout)
-- CONFIRMED: those still at one of the two get a single row at createdAt.
-- Orders that have moved further get PENDING at createdAt plus their current
-- status (exact change time unknown — cancelledAt when cancelled, otherwise
-- the last update).
INSERT INTO "dbo"."OrderStatusHistory" ("orderId", "statusId", "createdAt")
SELECT o."id", o."statusId", o."createdAt"
FROM "dbo"."Order" o
JOIN "cla"."OrderStatus" s ON s."id" = o."statusId"
WHERE s."key" IN ('PENDING', 'CONFIRMED');

INSERT INTO "dbo"."OrderStatusHistory" ("orderId", "statusId", "createdAt")
SELECT o."id", p."id", o."createdAt"
FROM "dbo"."Order" o
JOIN "cla"."OrderStatus" s ON s."id" = o."statusId"
JOIN "cla"."OrderStatus" p ON p."key" = 'PENDING'
WHERE s."key" NOT IN ('PENDING', 'CONFIRMED');

INSERT INTO "dbo"."OrderStatusHistory" ("orderId", "statusId", "createdAt")
SELECT o."id", o."statusId", COALESCE(o."cancelledAt", o."updatedAt")
FROM "dbo"."Order" o
JOIN "cla"."OrderStatus" s ON s."id" = o."statusId"
WHERE s."key" NOT IN ('PENDING', 'CONFIRMED');
