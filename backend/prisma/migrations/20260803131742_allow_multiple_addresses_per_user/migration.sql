-- DropIndex
DROP INDEX "dbo"."Address_userId_key";

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "dbo"."Address"("userId");
