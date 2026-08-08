-- CreateEnum
CREATE TYPE "dbo"."OrderDeliverySpeed" AS ENUM ('STANDARD', 'EXPRESS');

-- AlterTable
ALTER TABLE "dbo"."Order" ADD COLUMN     "deliveryCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deliverySpeed" "dbo"."OrderDeliverySpeed",
ADD COLUMN     "deliveryTimeSnapshot" TEXT;
