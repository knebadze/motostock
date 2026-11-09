-- Admin compatibility page (compatibility.repository.ts's findNewestFitments
-- / findNewestRules): ORDER BY "createdAt" DESC, "id" DESC LIMIT n on each
-- table — an index in that order serves it without sorting the table.
CREATE INDEX "ProductFitment_createdAt_id_idx" ON "dbo"."ProductFitment"("createdAt" DESC, "id" DESC);
CREATE INDEX "ProductFitmentRule_createdAt_id_idx" ON "dbo"."ProductFitmentRule"("createdAt" DESC, "id" DESC);
