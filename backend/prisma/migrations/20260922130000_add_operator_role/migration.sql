-- Role is a plain DB table (not an enum), so the new OPERATOR role needs an
-- actual row, not a schema change — seed.ts's own upsert covers a fresh dev
-- DB, but this guarantees the row exists in every already-deployed
-- environment too, since `migrate deploy` (unlike `db seed`) always runs.
INSERT INTO "cla"."Role" ("name")
VALUES ('OPERATOR')
ON CONFLICT ("name") DO NOTHING;
