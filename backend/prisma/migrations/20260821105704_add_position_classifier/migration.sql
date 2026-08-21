/*
  Warnings:

  - You are about to drop the column `roleEn` on the `TeamMember` table. All the data in the column will be lost.
  - You are about to drop the column `roleKa` on the `TeamMember` table. All the data in the column will be lost.
  - You are about to drop the column `roleRu` on the `TeamMember` table. All the data in the column will be lost.
  - Added the required column `positionId` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dbo"."TeamMember" DROP COLUMN "roleEn",
DROP COLUMN "roleKa",
DROP COLUMN "roleRu",
ADD COLUMN     "positionId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "cla"."Position" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_key_key" ON "cla"."Position"("key");

-- AddForeignKey
ALTER TABLE "dbo"."TeamMember" ADD CONSTRAINT "TeamMember_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "cla"."Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
