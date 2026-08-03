-- Split User.name into firstName + lastName. Existing rows are backfilled by
-- splitting the current name on the first space; single-word names get the
-- same value in both columns rather than an empty lastName.
ALTER TABLE "dbo"."User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "dbo"."User" ADD COLUMN "lastName" TEXT;

UPDATE "dbo"."User" SET
  "firstName" = split_part("name", ' ', 1),
  "lastName" = CASE
    WHEN POSITION(' ' IN "name") > 0
    THEN NULLIF(TRIM(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)), '')
    ELSE NULL
  END;

UPDATE "dbo"."User" SET "lastName" = "firstName" WHERE "lastName" IS NULL;

ALTER TABLE "dbo"."User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "dbo"."User" ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "dbo"."User" DROP COLUMN "name";
