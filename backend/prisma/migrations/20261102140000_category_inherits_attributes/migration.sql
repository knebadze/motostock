-- Category.inheritsAttributes: off = the category (and its subtree) stops
-- inheriting attributes from its ancestors.
ALTER TABLE "cla"."Category" ADD COLUMN "inheritsAttributes" BOOLEAN NOT NULL DEFAULT true;

-- Helmet accessories don't take helmet attributes (required certification,
-- shell, weight), luggage doesn't take riding-gear ones (season), and
-- oils/care products don't take the spare-parts "origin" (OEM/aftermarket).
UPDATE "cla"."Category" SET "inheritsAttributes" = false
WHERE "slug" IN ('helmet-accessories', 'luggage', 'fluids');

-- Values those subtrees' products hold for attributes they no longer
-- inherit — they'd otherwise fail validation on the product's next save.
WITH RECURSIVE subtree AS (
  SELECT "id", "id" AS "rootId" FROM "cla"."Category"
  WHERE "slug" IN ('helmet-accessories', 'luggage', 'fluids')
  UNION ALL
  SELECT c."id", s."rootId" FROM "cla"."Category" c JOIN subtree s ON c."parentId" = s."id"
)
DELETE FROM "dbo"."ProductAttributeValue" pav
USING "dbo"."Product" p, subtree s, "cla"."Attribute" a
WHERE pav."productId" = p."id"
  AND p."categoryId" = s."id"
  AND a."id" = pav."attributeId"
  AND a."categoryId" NOT IN (SELECT st."id" FROM subtree st WHERE st."rootId" = s."rootId");

-- "Material/compound" belongs to brake pads only (they have their own), not
-- to discs/calipers/lines; exhaust "type" just repeated the subcategories.
DELETE FROM "dbo"."ProductAttributeValue" WHERE "attributeId" IN (
  SELECT a."id" FROM "cla"."Attribute" a JOIN "cla"."Category" c ON c."id" = a."categoryId"
  WHERE (c."slug" = 'brakes' AND a."nameKa" = 'მასალა/კომპაუნდი') OR (c."slug" = 'exhaust' AND a."nameKa" = 'ტიპი')
);
DELETE FROM "cla"."Attribute" WHERE "id" IN (
  SELECT a."id" FROM "cla"."Attribute" a JOIN "cla"."Category" c ON c."id" = a."categoryId"
  WHERE (c."slug" = 'brakes' AND a."nameKa" = 'მასალა/კომპაუნდი') OR (c."slug" = 'exhaust' AND a."nameKa" = 'ტიპი')
);

-- ECE 22.05 and 22.06 are different standards: the existing option becomes
-- 22.05 (prisma/seed.ts adds a separate 22.06 one).
UPDATE "cla"."AttributeOption" o SET "labelKa" = 'ECE 22.05', "labelEn" = 'ECE 22.05', "labelRu" = 'ECE 22.05'
FROM "cla"."Attribute" a JOIN "cla"."Category" c ON c."id" = a."categoryId"
WHERE o."attributeId" = a."id" AND c."slug" = 'helmets' AND a."nameKa" = 'უსაფრთხოების სერტიფიკატი' AND o."key" = 'ECE';

-- The jacket armor level is EN 1621-1 (limb protectors).
UPDATE "cla"."Attribute" a SET "nameKa" = 'დამცავის დონე (EN 1621-1)', "nameEn" = 'Armor Level (EN 1621-1)', "nameRu" = 'Уровень защиты (EN 1621-1)'
FROM "cla"."Category" c
WHERE c."id" = a."categoryId" AND c."slug" = 'jackets' AND a."nameKa" = 'დამცავის CE დონე';
UPDATE "cla"."AttributeOption" o SET "labelKa" = 'დონე 1', "labelEn" = 'Level 1', "labelRu" = 'Уровень 1'
FROM "cla"."Attribute" a WHERE o."attributeId" = a."id" AND a."nameKa" = 'დამცავის დონე (EN 1621-1)' AND o."key" = 'CE1';
UPDATE "cla"."AttributeOption" o SET "labelKa" = 'დონე 2', "labelEn" = 'Level 2', "labelRu" = 'Уровень 2'
FROM "cla"."Attribute" a WHERE o."attributeId" = a."id" AND a."nameKa" = 'დამცავის დონე (EN 1621-1)' AND o."key" = 'CE2';
