-- DropIndex
DROP INDEX "dbo"."NewsletterSubscriber_confirmToken_key";

-- DropIndex
DROP INDEX "dbo"."NewsletterSubscriber_unsubscribeToken_key";

-- AlterTable
ALTER TABLE "dbo"."NewsletterSubscriber" DROP COLUMN "confirmToken",
DROP COLUMN "unsubscribeToken",
ADD COLUMN     "confirmTokenHash" TEXT,
ADD COLUMN     "unsubscribeTokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmTokenHash_key" ON "dbo"."NewsletterSubscriber"("confirmTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeTokenHash_key" ON "dbo"."NewsletterSubscriber"("unsubscribeTokenHash");

