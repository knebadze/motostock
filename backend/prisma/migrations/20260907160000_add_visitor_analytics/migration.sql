-- CreateTable
CREATE TABLE "dbo"."VisitorPresence" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorPresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitorPresence_userId_key" ON "dbo"."VisitorPresence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorPresence_guestId_key" ON "dbo"."VisitorPresence"("guestId");

-- CreateIndex
CREATE INDEX "VisitorPresence_lastSeenAt_idx" ON "dbo"."VisitorPresence"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "dbo"."VisitorPresence" ADD CONSTRAINT "VisitorPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "dbo"."VisitorPresence"
  ADD CONSTRAINT "VisitorPresence_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));

-- CreateTable
CREATE TABLE "dbo"."VisitorVisit" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitorVisit_date_idx" ON "dbo"."VisitorVisit"("date");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorVisit_date_userId_key" ON "dbo"."VisitorVisit"("date", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorVisit_date_guestId_key" ON "dbo"."VisitorVisit"("date", "guestId");

-- AddForeignKey
ALTER TABLE "dbo"."VisitorVisit" ADD CONSTRAINT "VisitorVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "dbo"."VisitorVisit"
  ADD CONSTRAINT "VisitorVisit_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));
