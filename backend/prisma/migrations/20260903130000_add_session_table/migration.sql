-- CreateTable
CREATE TABLE "dbo"."Session" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "dbo"."Session"("userId");

-- AddForeignKey
-- Owned child of User (a session has no meaning without its user) —
-- Cascade, matching this project's deletion philosophy for owned children.
ALTER TABLE "dbo"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
