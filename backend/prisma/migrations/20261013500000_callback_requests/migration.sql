-- "Call me back" requests from listing pages + the shop's WhatsApp number.

ALTER TYPE "dbo"."EmailTemplateKey" ADD VALUE 'CALLBACK_REQUEST_ADMIN';

ALTER TABLE "dbo"."CompanyInfo" ADD COLUMN "whatsappPhone" TEXT;

CREATE TYPE "dbo"."CallbackRequestStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "dbo"."CallbackRequest" (
    "id" SERIAL NOT NULL,
    "vehicleListingId" INTEGER,
    "itemTitle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredTime" TEXT,
    "note" TEXT,
    "status" "dbo"."CallbackRequestStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallbackRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CallbackRequest_status_createdAt_idx" ON "dbo"."CallbackRequest"("status", "createdAt");
CREATE INDEX "CallbackRequest_vehicleListingId_idx" ON "dbo"."CallbackRequest"("vehicleListingId");
CREATE INDEX "CallbackRequest_resolvedByUserId_idx" ON "dbo"."CallbackRequest"("resolvedByUserId");

ALTER TABLE "dbo"."CallbackRequest" ADD CONSTRAINT "CallbackRequest_vehicleListingId_fkey"
    FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dbo"."CallbackRequest" ADD CONSTRAINT "CallbackRequest_resolvedByUserId_fkey"
    FOREIGN KEY ("resolvedByUserId") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
