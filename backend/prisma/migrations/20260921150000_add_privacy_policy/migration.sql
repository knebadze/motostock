-- CreateTable
CREATE TABLE "dbo"."PrivacyPolicy" (
    "id" SERIAL NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "contentKa" TEXT NOT NULL DEFAULT '',
    "contentEn" TEXT NOT NULL DEFAULT '',
    "contentRu" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyPolicy_singleton_key" ON "dbo"."PrivacyPolicy"("singleton");
