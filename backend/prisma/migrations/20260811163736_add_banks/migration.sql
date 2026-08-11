-- AlterTable
ALTER TABLE "dbo"."Order" ADD COLUMN     "bankId" INTEGER;

-- CreateTable
CREATE TABLE "dbo"."Bank" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "supportsInstallment" BOOLEAN NOT NULL DEFAULT false,
    "supportsSplitPayment" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bank_key_key" ON "dbo"."Bank"("key");

-- CreateIndex
CREATE INDEX "Order_bankId_idx" ON "dbo"."Order"("bankId");

-- AddForeignKey
ALTER TABLE "dbo"."Order" ADD CONSTRAINT "Order_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "dbo"."Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

