-- CreateTable
CREATE TABLE "dbo"."TermsAndConditions" (
    "id" SERIAL NOT NULL,
    "contentKa" TEXT NOT NULL DEFAULT '',
    "contentEn" TEXT NOT NULL DEFAULT '',
    "contentRu" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsAndConditions_pkey" PRIMARY KEY ("id")
);

