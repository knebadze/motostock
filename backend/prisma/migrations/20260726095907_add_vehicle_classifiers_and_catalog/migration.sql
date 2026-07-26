-- CreateTable
CREATE TABLE "cla"."Brand" (
    "id" SERIAL NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."Condition" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."CoolingType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "CoolingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."DriveType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "DriveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."FinalDriveType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "FinalDriveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."FuelType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "FuelType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."ListingStatus" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "ListingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."Model" (
    "id" SERIAL NOT NULL,
    "brandId" INTEGER NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."StartType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "StartType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cla"."TransmissionType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "TransmissionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."VehicleCatalog" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "engineVolumeCc" INTEGER,
    "enginePowerHp" INTEGER,
    "cylinderCount" INTEGER,
    "gearCount" INTEGER,
    "seatCount" INTEGER,
    "fuelTypeId" INTEGER,
    "transmissionTypeId" INTEGER,
    "coolingTypeId" INTEGER,
    "finalDriveTypeId" INTEGER,
    "driveTypeId" INTEGER,
    "startTypeId" INTEGER,
    "imageUrl" TEXT,
    "descriptionKa" TEXT,
    "descriptionEn" TEXT,
    "descriptionRu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."VehicleListing" (
    "id" SERIAL NOT NULL,
    "vehicleCatalogId" INTEGER NOT NULL,
    "conditionId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "cla"."Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_key_key" ON "cla"."Condition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CoolingType_key_key" ON "cla"."CoolingType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DriveType_key_key" ON "cla"."DriveType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FinalDriveType_key_key" ON "cla"."FinalDriveType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FuelType_key_key" ON "cla"."FuelType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ListingStatus_key_key" ON "cla"."ListingStatus"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Model_brandId_slug_key" ON "cla"."Model"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "StartType_key_key" ON "cla"."StartType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TransmissionType_key_key" ON "cla"."TransmissionType"("key");

-- AddForeignKey
ALTER TABLE "cla"."Model" ADD CONSTRAINT "Model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "cla"."Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cla"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "cla"."Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "cla"."Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "cla"."FuelType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_transmissionTypeId_fkey" FOREIGN KEY ("transmissionTypeId") REFERENCES "cla"."TransmissionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_coolingTypeId_fkey" FOREIGN KEY ("coolingTypeId") REFERENCES "cla"."CoolingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_finalDriveTypeId_fkey" FOREIGN KEY ("finalDriveTypeId") REFERENCES "cla"."FinalDriveType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_driveTypeId_fkey" FOREIGN KEY ("driveTypeId") REFERENCES "cla"."DriveType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleCatalog" ADD CONSTRAINT "VehicleCatalog_startTypeId_fkey" FOREIGN KEY ("startTypeId") REFERENCES "cla"."StartType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListing" ADD CONSTRAINT "VehicleListing_vehicleCatalogId_fkey" FOREIGN KEY ("vehicleCatalogId") REFERENCES "dbo"."VehicleCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListing" ADD CONSTRAINT "VehicleListing_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "cla"."Condition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListing" ADD CONSTRAINT "VehicleListing_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "cla"."ListingStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
