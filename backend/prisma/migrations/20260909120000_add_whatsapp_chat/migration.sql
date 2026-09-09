-- CreateEnum
CREATE TYPE "dbo"."WhatsAppMessageSender" AS ENUM ('CUSTOMER', 'STAFF', 'SYSTEM');

-- CreateTable
CREATE TABLE "dbo"."WhatsAppChatSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."WhatsAppChatMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "sender" "dbo"."WhatsAppMessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "relayWhatsAppMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppChatSession_userId_idx" ON "dbo"."WhatsAppChatSession"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppChatSession_guestId_idx" ON "dbo"."WhatsAppChatSession"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChatMessage_relayWhatsAppMessageId_key" ON "dbo"."WhatsAppChatMessage"("relayWhatsAppMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppChatMessage_sessionId_createdAt_idx" ON "dbo"."WhatsAppChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "dbo"."WhatsAppChatSession" ADD CONSTRAINT "WhatsAppChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."WhatsAppChatMessage" ADD CONSTRAINT "WhatsAppChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "dbo"."WhatsAppChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same "exactly one of userId/guestId" owner invariant as CartItem/
-- WishlistItem/CompareItem/ProductView/VehicleListingView (see migration
-- 20260818093000_add_owner_xor_check_constraints) — enforced at the DB
-- level so a service-layer bug can't write an unowned or ambiguously-owned
-- session.
ALTER TABLE "dbo"."WhatsAppChatSession"
  ADD CONSTRAINT "WhatsAppChatSession_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));
