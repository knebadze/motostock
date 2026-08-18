-- Payment-gateway credentials don't belong in the database (even
-- admin-only, even masked on read) — they belong in environment
-- variables, same as every other external-service credential in this
-- codebase (FINA_*/SMTP_*/VINCARIO_*). This column was never populated by
-- a real integration.
ALTER TABLE "dbo"."Bank" DROP COLUMN "credentials";
