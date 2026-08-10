-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "dbo"."HomepageSectionType" ADD VALUE 'DISCOUNTED_MIXED';
ALTER TYPE "dbo"."HomepageSectionType" ADD VALUE 'POPULAR_MIXED';

-- AlterTable
ALTER TABLE "dbo"."HomepageSection" ADD COLUMN     "productItemCount" INTEGER,
ADD COLUMN     "vehicleItemCount" INTEGER;

