-- CreateEnum
CREATE TYPE "dbo"."WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "dbo"."CompanyInfo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "cityId" INTEGER,
    "street" TEXT,
    "phone" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "tiktokUrl" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."CompanyWorkingHour" (
    "id" SERIAL NOT NULL,
    "companyInfoId" INTEGER NOT NULL,
    "dayOfWeek" "dbo"."WeekDay" NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT,
    "closeTime" TEXT,

    CONSTRAINT "CompanyWorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyInfo_cityId_idx" ON "dbo"."CompanyInfo"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWorkingHour_companyInfoId_dayOfWeek_key" ON "dbo"."CompanyWorkingHour"("companyInfoId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "dbo"."CompanyInfo" ADD CONSTRAINT "CompanyInfo_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cla"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."CompanyWorkingHour" ADD CONSTRAINT "CompanyWorkingHour_companyInfoId_fkey" FOREIGN KEY ("companyInfoId") REFERENCES "dbo"."CompanyInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
