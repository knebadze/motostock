-- AlterTable
ALTER TABLE "dbo"."VehicleListing" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "dbo"."VehicleListingView" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "guestId" TEXT,
    "vehicleListingId" INTEGER NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleListingView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleListingView_userId_idx" ON "dbo"."VehicleListingView"("userId");

-- CreateIndex
CREATE INDEX "VehicleListingView_guestId_idx" ON "dbo"."VehicleListingView"("guestId");

-- CreateIndex
CREATE INDEX "VehicleListingView_vehicleListingId_idx" ON "dbo"."VehicleListingView"("vehicleListingId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleListingView_userId_vehicleListingId_key" ON "dbo"."VehicleListingView"("userId", "vehicleListingId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleListingView_guestId_vehicleListingId_key" ON "dbo"."VehicleListingView"("guestId", "vehicleListingId");

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListingView" ADD CONSTRAINT "VehicleListingView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dbo"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dbo"."VehicleListingView" ADD CONSTRAINT "VehicleListingView_vehicleListingId_fkey" FOREIGN KEY ("vehicleListingId") REFERENCES "dbo"."VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

