-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "cla"."Category"("parentId");

-- CreateIndex
CREATE INDEX "Model_categoryId_idx" ON "cla"."Model"("categoryId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "dbo"."User"("roleId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_categoryId_idx" ON "dbo"."VehicleCatalog"("categoryId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_brandId_idx" ON "dbo"."VehicleCatalog"("brandId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_modelId_idx" ON "dbo"."VehicleCatalog"("modelId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_fuelTypeId_idx" ON "dbo"."VehicleCatalog"("fuelTypeId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_transmissionTypeId_idx" ON "dbo"."VehicleCatalog"("transmissionTypeId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_coolingTypeId_idx" ON "dbo"."VehicleCatalog"("coolingTypeId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_finalDriveTypeId_idx" ON "dbo"."VehicleCatalog"("finalDriveTypeId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_driveTypeId_idx" ON "dbo"."VehicleCatalog"("driveTypeId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_startTypeId_idx" ON "dbo"."VehicleCatalog"("startTypeId");

-- CreateIndex
CREATE INDEX "VehicleCatalog_powertrainTypeId_idx" ON "dbo"."VehicleCatalog"("powertrainTypeId");

-- CreateIndex
CREATE INDEX "VehicleListing_vehicleCatalogId_idx" ON "dbo"."VehicleListing"("vehicleCatalogId");

-- CreateIndex
CREATE INDEX "VehicleListing_conditionId_idx" ON "dbo"."VehicleListing"("conditionId");

-- CreateIndex
CREATE INDEX "VehicleListing_statusId_idx" ON "dbo"."VehicleListing"("statusId");

-- CreateIndex
CREATE INDEX "VehicleListing_colorId_idx" ON "dbo"."VehicleListing"("colorId");

-- CreateIndex
CREATE INDEX "VehicleListingDiscount_vehicleListingId_startDate_endDate_idx" ON "dbo"."VehicleListingDiscount"("vehicleListingId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "VehicleListingImage_vehicleListingId_position_idx" ON "dbo"."VehicleListingImage"("vehicleListingId", "position");
