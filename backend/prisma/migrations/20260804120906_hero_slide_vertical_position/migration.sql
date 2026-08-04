-- CreateEnum
CREATE TYPE "dbo"."HeroSlideVerticalPosition" AS ENUM ('TOP', 'MIDDLE', 'BOTTOM');

-- AlterTable
ALTER TABLE "dbo"."HeroSlide" ADD COLUMN     "verticalPosition" "dbo"."HeroSlideVerticalPosition" NOT NULL DEFAULT 'BOTTOM';
