-- CreateEnum
CREATE TYPE "dbo"."PaymentStatus" AS ENUM ('NOT_APPLICABLE', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "dbo"."Order"
  ADD COLUMN "paymentStatus" "dbo"."PaymentStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "paymentTransactionId" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "paymentPlanLabel" TEXT;
