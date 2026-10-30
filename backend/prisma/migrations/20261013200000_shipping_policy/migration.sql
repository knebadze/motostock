-- Singleton admin-editable "Delivery & Returns" page content (same shape
-- as PrivacyPolicy).
CREATE TABLE "dbo"."ShippingPolicy" (
    "id" SERIAL NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "contentKa" TEXT NOT NULL DEFAULT '',
    "contentEn" TEXT NOT NULL DEFAULT '',
    "contentRu" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShippingPolicy_singleton_key" ON "dbo"."ShippingPolicy"("singleton");
