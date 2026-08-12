-- DropIndex
DROP INDEX "dbo"."NewsletterSubscriber_unsubscribeTokenHash_key";

-- AlterTable
ALTER TABLE "dbo"."NewsletterSubscriber" DROP COLUMN "unsubscribeTokenHash",
ADD COLUMN     "unsubscribeToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "dbo"."NewsletterSubscriber"("unsubscribeToken");

