-- CreateEnum
CREATE TYPE "dbo"."HeroSlideType" AS ENUM ('CTA', 'VEHICLE_SEARCH');

-- CreateTable
CREATE TABLE "dbo"."HeroSlide" (
    "id" SERIAL NOT NULL,
    "type" "dbo"."HeroSlideType" NOT NULL,
    "titleKa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "subtitleKa" TEXT,
    "subtitleEn" TEXT,
    "subtitleRu" TEXT,
    "imageUrl" TEXT,
    "buttonLabelKa" TEXT,
    "buttonLabelEn" TEXT,
    "buttonLabelRu" TEXT,
    "buttonLink" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);
