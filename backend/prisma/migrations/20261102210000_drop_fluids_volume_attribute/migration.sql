-- Oils' volume is now the variant size scale (VOLUME: 1 ლ, 4 ლ, ...), so
-- the separate "მოცულობა" attribute on "fluids" only duplicated it.
DELETE FROM "dbo"."ProductAttributeValue" WHERE "attributeId" IN (
  SELECT a."id" FROM "cla"."Attribute" a JOIN "cla"."Category" c ON c."id" = a."categoryId"
  WHERE c."slug" = 'fluids' AND a."nameKa" = 'მოცულობა'
);
DELETE FROM "cla"."Attribute" WHERE "id" IN (
  SELECT a."id" FROM "cla"."Attribute" a JOIN "cla"."Category" c ON c."id" = a."categoryId"
  WHERE c."slug" = 'fluids' AND a."nameKa" = 'მოცულობა'
);
