-- Walk-in phone claims (see user.prisma's phoneClaimedByUserId).
ALTER TABLE "dbo"."User" ADD COLUMN "phoneClaimedByUserId" INTEGER;

ALTER TABLE "dbo"."User"
  ADD CONSTRAINT "User_phoneClaimedByUserId_fkey" FOREIGN KEY ("phoneClaimedByUserId")
  REFERENCES "dbo"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
