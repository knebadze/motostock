-- CreateEnum
CREATE TYPE "dbo"."AuthEventType" AS ENUM ('REGISTER', 'LOGIN_SUCCESS', 'LOGIN_FAILURE');

-- CreateEnum
CREATE TYPE "dbo"."OrderRiskFlagType" AS ENUM ('NEW_ACCOUNT_HIGH_VALUE', 'ORDER_VELOCITY', 'PROMO_CODE_MULTI_ACCOUNT', 'SHARED_IP_MULTIPLE_ACCOUNTS');

-- AlterTable
ALTER TABLE "dbo"."Order" ADD COLUMN     "ipAddress" TEXT;

-- AlterTable
ALTER TABLE "dbo"."User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "dbo"."AuthEvent" (
    "id" SERIAL NOT NULL,
    "type" "dbo"."AuthEventType" NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."EmailVerificationToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."OrderRiskFlag" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "type" "dbo"."OrderRiskFlagType" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthEvent_userId_idx" ON "dbo"."AuthEvent"("userId");

-- CreateIndex
CREATE INDEX "AuthEvent_email_idx" ON "dbo"."AuthEvent"("email");

-- CreateIndex
CREATE INDEX "AuthEvent_ipAddress_idx" ON "dbo"."AuthEvent"("ipAddress");

-- CreateIndex
CREATE INDEX "AuthEvent_createdAt_idx" ON "dbo"."AuthEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "dbo"."EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "dbo"."EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "OrderRiskFlag_orderId_idx" ON "dbo"."OrderRiskFlag"("orderId");

-- CreateIndex
CREATE INDEX "OrderRiskFlag_type_idx" ON "dbo"."OrderRiskFlag"("type");

-- AddForeignKey
ALTER TABLE "dbo"."AuthEvent" ADD CONSTRAINT "AuthEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."OrderRiskFlag" ADD CONSTRAINT "OrderRiskFlag_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "dbo"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

