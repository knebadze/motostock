-- CreateEnum
CREATE TYPE "dbo"."HomepageProductSliderType" AS ENUM ('DISCOUNTED', 'POPULAR');

-- AlterTable
ALTER TABLE "dbo"."Product" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "dbo"."HomepageProductSlider" (
    "id" SERIAL NOT NULL,
    "type" "dbo"."HomepageProductSliderType" NOT NULL,
    "titleKa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageProductSlider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageProductSlider_type_key" ON "dbo"."HomepageProductSlider"("type");
