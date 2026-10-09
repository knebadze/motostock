-- Processed inbound WhatsApp webhook message ids (dedupe Meta retries).
CREATE TABLE "dbo"."WhatsAppInboundMessage" (
    "messageId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppInboundMessage_pkey" PRIMARY KEY ("messageId")
);

CREATE INDEX "WhatsAppInboundMessage_receivedAt_idx" ON "dbo"."WhatsAppInboundMessage"("receivedAt");
