-- AlterTable
ALTER TABLE "cla"."Attribute" ADD COLUMN     "unitId" INTEGER;

-- CreateTable
CREATE TABLE "cla"."Unit" (
    "id" SERIAL NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cla"."Attribute" ADD CONSTRAINT "Attribute_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "cla"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
