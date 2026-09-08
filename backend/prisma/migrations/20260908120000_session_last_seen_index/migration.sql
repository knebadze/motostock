-- The admin "active sessions" page (session.repository.ts's findManyForAdmin)
-- sorts every page of results by lastSeenAt desc, with no index backing that
-- column — only @@index([userId]) existed. Fine on a small table, but this
-- table has no retention policy at all (see the model comment: a Session row
-- past its own JWT's expiry is harmless dead weight but was never actually
-- swept), so it only grows, and an unindexed sort degrades right along with
-- it. Paired with pruneStaleSessions (visitors.service.ts) in migration-
-- adjacent code, not schema, since the prune itself needs no DB change.
CREATE INDEX "Session_lastSeenAt_idx" ON "dbo"."Session" ("lastSeenAt" DESC);
