-- AlterTable
ALTER TABLE "dbo"."CompanyInfo" ADD COLUMN "singleton" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInfo_singleton_key" ON "dbo"."CompanyInfo"("singleton");

-- AlterTable
ALTER TABLE "dbo"."TermsAndConditions" ADD COLUMN "singleton" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "TermsAndConditions_singleton_key" ON "dbo"."TermsAndConditions"("singleton");
