-- CreateTable
CREATE TABLE "dbo"."Address" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    "street" TEXT NOT NULL,
    "building" TEXT,
    "apartment" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."City" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "dbo"."Address"("userId");

-- CreateIndex
CREATE INDEX "Address_cityId_idx" ON "dbo"."Address"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "City_key_key" ON "cla"."City"("key");

-- AddForeignKey
ALTER TABLE "dbo"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."Address" ADD CONSTRAINT "Address_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cla"."City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
