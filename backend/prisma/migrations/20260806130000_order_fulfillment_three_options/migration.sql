-- AlterEnum
-- No orders have been placed yet, so this drops and recreates the enum
-- (splitting COURIER_CARD into two distinct options, CARD and COURIER)
-- instead of a data-preserving ALTER TYPE ... RENAME VALUE.
ALTER TABLE "dbo"."Order" ALTER COLUMN "fulfillmentMethod" TYPE TEXT USING "fulfillmentMethod"::TEXT;
DROP TYPE "dbo"."OrderFulfillmentMethod";
CREATE TYPE "dbo"."OrderFulfillmentMethod" AS ENUM ('CARD', 'COURIER', 'PICKUP');
ALTER TABLE "dbo"."Order" ALTER COLUMN "fulfillmentMethod" TYPE "dbo"."OrderFulfillmentMethod" USING "fulfillmentMethod"::"dbo"."OrderFulfillmentMethod";
