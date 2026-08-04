/*
  Warnings:

  - You are about to drop the column `abbreviation` on the `Unit` table. All the data in the column will be lost.
  - Added the required column `abbreviationEn` to the `Unit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `abbreviationKa` to the `Unit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `abbreviationRu` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cla"."Unit" DROP COLUMN "abbreviation",
ADD COLUMN     "abbreviationEn" TEXT NOT NULL,
ADD COLUMN     "abbreviationKa" TEXT NOT NULL,
ADD COLUMN     "abbreviationRu" TEXT NOT NULL;
