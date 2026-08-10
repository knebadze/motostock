-- CreateEnum
CREATE TYPE "dbo"."EmailTemplateKey" AS ENUM ('ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED');

-- CreateTable
CREATE TABLE "dbo"."EmailTemplate" (
    "id" SERIAL NOT NULL,
    "key" "dbo"."EmailTemplateKey" NOT NULL,
    "subjectKa" TEXT NOT NULL,
    "subjectEn" TEXT NOT NULL,
    "subjectRu" TEXT NOT NULL,
    "bodyKa" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyRu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "dbo"."EmailTemplate"("key");

