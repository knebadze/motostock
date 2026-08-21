-- AlterTable
ALTER TABLE "dbo"."ServiceRecord" ADD COLUMN     "mechanicId" INTEGER,
ADD COLUMN     "price" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "dbo"."ServiceRecord" ADD CONSTRAINT "ServiceRecord_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "dbo"."TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
