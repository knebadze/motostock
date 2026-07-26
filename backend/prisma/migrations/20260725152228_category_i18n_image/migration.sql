/*
  Warnings:

  - You are about to drop the column `name` on the `Category` table. All the data in the column will be lost.
  - Added the required column `nameEn` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameKa` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameRu` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cla"."Category" DROP COLUMN "name",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "nameEn" TEXT NOT NULL,
ADD COLUMN     "nameKa" TEXT NOT NULL,
ADD COLUMN     "nameRu" TEXT NOT NULL;
