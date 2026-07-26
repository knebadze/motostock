/*
  Warnings:

  - Added the required column `colorId` to the `VehicleListing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dbo"."VehicleListing" ADD COLUMN     "colorId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "cla"."Color" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_key_key" ON "cla"."Color"("key");

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListing" ADD CONSTRAINT "VehicleListing_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "cla"."Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
