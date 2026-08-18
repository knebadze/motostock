-- AlterTable
ALTER TABLE "dbo"."Order" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "dbo"."Order"("idempotencyKey");
