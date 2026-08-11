-- CreateTable
CREATE TABLE "dbo"."ProductView" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "productId" INTEGER NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductView_userId_idx" ON "dbo"."ProductView"("userId");

-- CreateIndex
CREATE INDEX "ProductView_guestId_idx" ON "dbo"."ProductView"("guestId");

-- CreateIndex
CREATE INDEX "ProductView_productId_idx" ON "dbo"."ProductView"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductView_userId_productId_key" ON "dbo"."ProductView"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductView_guestId_productId_key" ON "dbo"."ProductView"("guestId", "productId");

-- AddForeignKey
ALTER TABLE "dbo"."ProductView" ADD CONSTRAINT "ProductView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."ProductView" ADD CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "dbo"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

