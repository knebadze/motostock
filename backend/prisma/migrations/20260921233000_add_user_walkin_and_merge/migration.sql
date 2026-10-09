-- AlterTable
ALTER TABLE "dbo"."User"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "dateOfBirth" DATE,
  ADD COLUMN "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mergedIntoUserId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "dbo"."User"("phone");

-- AddForeignKey
ALTER TABLE "dbo"."User" ADD CONSTRAINT "User_mergedIntoUserId_fkey" FOREIGN KEY ("mergedIntoUserId") REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
