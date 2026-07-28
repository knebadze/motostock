-- AlterTable
-- passwordHash becomes optional: users created via Google/Facebook OAuth
-- have no password of their own.
ALTER TABLE "dbo"."User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "dbo"."User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "dbo"."User" ADD COLUMN "facebookId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "dbo"."User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_facebookId_key" ON "dbo"."User"("facebookId");
