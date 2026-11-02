-- Size scales: what a variant's "size" measures per category (see SizeScale).
CREATE TABLE "cla"."SizeScale" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    CONSTRAINT "SizeScale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SizeScale_key_key" ON "cla"."SizeScale"("key");

ALTER TABLE "cla"."Size" ADD COLUMN "scaleId" INTEGER;
ALTER TABLE "cla"."Size" ADD CONSTRAINT "Size_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "cla"."SizeScale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cla"."Category" ADD COLUMN "sizeScaleId" INTEGER;
ALTER TABLE "cla"."Category" ADD CONSTRAINT "Category_sizeScaleId_fkey" FOREIGN KEY ("sizeScaleId") REFERENCES "cla"."SizeScale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
