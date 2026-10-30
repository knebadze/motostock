-- Recorded acceptance of the terms / privacy policy (personal data
-- protection law, 2023).
CREATE TYPE "dbo"."UserConsentType" AS ENUM ('TERMS', 'PRIVACY_POLICY');
CREATE TYPE "dbo"."UserConsentMethod" AS ENUM ('REGISTRATION_CHECKBOX', 'OAUTH_NOTICE', 'ACCOUNT_PAGE');

CREATE TABLE "dbo"."UserConsent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "dbo"."UserConsentType" NOT NULL,
    "method" "dbo"."UserConsentMethod" NOT NULL,
    "documentVersion" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserConsent_userId_type_idx" ON "dbo"."UserConsent"("userId", "type");

ALTER TABLE "dbo"."UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
