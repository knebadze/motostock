-- Buy-together tags (see prisma/models/tag.prisma).
CREATE TABLE "cla"."Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- "ზეთის შეცვლა" and "ზეთის შეცვლა " / different letter case can't both
-- exist (Georgian has no case, but tags may be Latin, e.g. brand/model kits).
CREATE UNIQUE INDEX "Tag_name_normalized_key" ON "cla"."Tag" (lower(btrim("name")));

CREATE TABLE "dbo"."ProductTag" (
    "productId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId","tagId")
);

CREATE INDEX "ProductTag_tagId_idx" ON "dbo"."ProductTag"("tagId");

ALTER TABLE "dbo"."ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dbo"."ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "cla"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
