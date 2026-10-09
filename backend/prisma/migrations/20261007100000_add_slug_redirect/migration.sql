-- Old product/category slugs -> 301 to the current URL (see slug-redirect.prisma).
CREATE TYPE "dbo"."SlugRedirectEntity" AS ENUM ('PRODUCT', 'CATEGORY');

CREATE TABLE "dbo"."SlugRedirect" (
    "id" SERIAL NOT NULL,
    "entityType" "dbo"."SlugRedirectEntity" NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SlugRedirect_entityType_oldSlug_key" ON "dbo"."SlugRedirect"("entityType", "oldSlug");
CREATE INDEX "SlugRedirect_entityType_entityId_idx" ON "dbo"."SlugRedirect"("entityType", "entityId");
