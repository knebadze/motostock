-- Vehicle Brand/Model names are not per-locale translated (they're proper
-- nouns / model codes) — collapse the three localized columns into one
-- `name`, keeping the existing English (Latin-script) values.
ALTER TABLE "cla"."Brand" DROP COLUMN "nameKa";
ALTER TABLE "cla"."Brand" DROP COLUMN "nameRu";
ALTER TABLE "cla"."Brand" RENAME COLUMN "nameEn" TO "name";

ALTER TABLE "cla"."Model" DROP COLUMN "nameKa";
ALTER TABLE "cla"."Model" DROP COLUMN "nameRu";
ALTER TABLE "cla"."Model" RENAME COLUMN "nameEn" TO "name";
