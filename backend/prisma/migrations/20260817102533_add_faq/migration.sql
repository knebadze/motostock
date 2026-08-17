-- CreateTable
CREATE TABLE "dbo"."Faq" (
    "id" SERIAL NOT NULL,
    "questionKa" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionRu" TEXT NOT NULL,
    "answerKa" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerRu" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

