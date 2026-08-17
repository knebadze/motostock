-- AlterTable
ALTER TABLE "dbo"."Order" ADD COLUMN     "cancellationNote" TEXT,
ADD COLUMN     "cancellationReasonId" INTEGER;

-- CreateTable
CREATE TABLE "cla"."CancellationReason" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "CancellationReason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CancellationReason_key_key" ON "cla"."CancellationReason"("key");

-- CreateIndex
CREATE INDEX "Order_cancellationReasonId_idx" ON "dbo"."Order"("cancellationReasonId");

-- AddForeignKey
ALTER TABLE "dbo"."Order" ADD CONSTRAINT "Order_cancellationReasonId_fkey" FOREIGN KEY ("cancellationReasonId") REFERENCES "cla"."CancellationReason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

