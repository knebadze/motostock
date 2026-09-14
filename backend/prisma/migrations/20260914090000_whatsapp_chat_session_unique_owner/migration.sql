-- Fixes a check-then-create race in whatsapp-chat.service.ts's
-- postCustomerMessage: two near-simultaneous first messages from the same
-- visitor could both see "no session yet" and both create one, splitting
-- that visitor's conversation across two rows. Nothing at the DB level
-- prevented it — WhatsAppChatSession only had plain (non-unique) indexes on
-- userId/guestId. Before adding the unique indexes below, any duplicate
-- session pairs the race already produced are folded together: messages
-- from every extra session are reparented onto the lowest-id session for
-- that owner, then the now-empty duplicates are removed. Same
-- one-row-per-owner shape as VisitorPresence (migration
-- 20260907160000_add_visitor_analytics) — a plain @@unique per nullable
-- owner column, since Postgres treats NULLs as distinct and only
-- constrains the non-null side.

-- Dedupe by userId.
WITH ranked AS (
  SELECT "id", MIN("id") OVER (PARTITION BY "userId") AS "keepId"
  FROM "dbo"."WhatsAppChatSession"
  WHERE "userId" IS NOT NULL
)
UPDATE "dbo"."WhatsAppChatMessage" AS m
SET "sessionId" = r."keepId"
FROM ranked r
WHERE m."sessionId" = r."id" AND r."id" <> r."keepId";

DELETE FROM "dbo"."WhatsAppChatSession" s
USING (
  SELECT "id", MIN("id") OVER (PARTITION BY "userId") AS "keepId"
  FROM "dbo"."WhatsAppChatSession"
  WHERE "userId" IS NOT NULL
) r
WHERE s."id" = r."id" AND r."id" <> r."keepId";

-- Dedupe by guestId.
WITH ranked AS (
  SELECT "id", MIN("id") OVER (PARTITION BY "guestId") AS "keepId"
  FROM "dbo"."WhatsAppChatSession"
  WHERE "guestId" IS NOT NULL
)
UPDATE "dbo"."WhatsAppChatMessage" AS m
SET "sessionId" = r."keepId"
FROM ranked r
WHERE m."sessionId" = r."id" AND r."id" <> r."keepId";

DELETE FROM "dbo"."WhatsAppChatSession" s
USING (
  SELECT "id", MIN("id") OVER (PARTITION BY "guestId") AS "keepId"
  FROM "dbo"."WhatsAppChatSession"
  WHERE "guestId" IS NOT NULL
) r
WHERE s."id" = r."id" AND r."id" <> r."keepId";

-- DropIndex
DROP INDEX "dbo"."WhatsAppChatSession_userId_idx";

-- DropIndex
DROP INDEX "dbo"."WhatsAppChatSession_guestId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChatSession_userId_key" ON "dbo"."WhatsAppChatSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChatSession_guestId_key" ON "dbo"."WhatsAppChatSession"("guestId");
