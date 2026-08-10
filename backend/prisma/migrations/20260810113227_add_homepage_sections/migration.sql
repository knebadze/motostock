-- CreateEnum
CREATE TYPE "dbo"."HomepageSectionType" AS ENUM ('DISCOUNTED_PRODUCTS', 'POPULAR_PRODUCTS', 'DISCOUNTED_VEHICLES', 'POPULAR_VEHICLES', 'CATEGORIES');

-- DropTable
DROP TABLE "dbo"."HomepageProductSlider";

-- DropEnum
DROP TYPE "dbo"."HomepageProductSliderType";

-- CreateTable
CREATE TABLE "dbo"."HomepageSection" (
    "id" SERIAL NOT NULL,
    "type" "dbo"."HomepageSectionType" NOT NULL,
    "titleKa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSection_type_key" ON "dbo"."HomepageSection"("type");

