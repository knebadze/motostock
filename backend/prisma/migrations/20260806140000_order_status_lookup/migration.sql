-- CreateTable
CREATE TABLE "cla"."OrderStatus" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "OrderStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderStatus_key_key" ON "cla"."OrderStatus"("key");

-- Seed the canonical statuses directly in this migration (not only via
-- prisma/seed.ts) so any order placed before this migration runs can be
-- backfilled to PENDING below without requiring a separate seed step first.
INSERT INTO "cla"."OrderStatus" ("key", "nameKa", "nameEn", "nameRu") VALUES
    ('PENDING', 'მუშავდება', 'Processing', 'В обработке'),
    ('CONFIRMED', 'დადასტურებულია', 'Confirmed', 'Подтверждён'),
    ('SHIPPED', 'კურიერთანაა', 'Out for delivery', 'У курьера'),
    ('DELIVERED', 'ჩაბარებულია', 'Delivered', 'Доставлен'),
    ('CANCELLED', 'გაუქმებულია', 'Cancelled', 'Отменён');

-- AlterTable Order: replace the "status" enum column with a "statusId" FK.
-- Added nullable first and backfilled to PENDING (rather than assuming an
-- empty table) since orders may already exist by the time this runs.
ALTER TABLE "dbo"."Order" ADD COLUMN "statusId" INTEGER;
UPDATE "dbo"."Order" SET "statusId" = (SELECT "id" FROM "cla"."OrderStatus" WHERE "key" = 'PENDING');
ALTER TABLE "dbo"."Order" ALTER COLUMN "statusId" SET NOT NULL;
ALTER TABLE "dbo"."Order" DROP COLUMN "status";
DROP TYPE "dbo"."OrderStatus";

-- CreateIndex
CREATE INDEX "Order_statusId_idx" ON "dbo"."Order"("statusId");

-- AddForeignKey
ALTER TABLE "dbo"."Order" ADD CONSTRAINT "Order_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "cla"."OrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
