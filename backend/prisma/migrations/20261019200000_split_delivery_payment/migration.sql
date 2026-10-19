-- Checkout: the single "fulfillment method" (CARD / COURIER / PICKUP) is split
-- into how the order is delivered and how it's paid, so e.g. "pay by card,
-- pick up in store" becomes possible.

CREATE TYPE "dbo"."OrderDeliveryMethod" AS ENUM ('COURIER', 'PICKUP');
CREATE TYPE "dbo"."OrderPaymentMethod" AS ENUM ('CARD', 'ON_DELIVERY', 'IN_STORE');

ALTER TABLE "dbo"."Order" ADD COLUMN "deliveryMethod" "dbo"."OrderDeliveryMethod";
ALTER TABLE "dbo"."Order" ADD COLUMN "paymentMethod" "dbo"."OrderPaymentMethod";

-- Existing orders: CARD was card + courier, COURIER was courier + pay the
-- courier, PICKUP was pickup + pay in store.
UPDATE "dbo"."Order" SET
  "deliveryMethod" = CASE WHEN "fulfillmentMethod" = 'PICKUP' THEN 'PICKUP'::"dbo"."OrderDeliveryMethod"
                          ELSE 'COURIER'::"dbo"."OrderDeliveryMethod" END,
  "paymentMethod" = CASE "fulfillmentMethod"
                      WHEN 'CARD' THEN 'CARD'::"dbo"."OrderPaymentMethod"
                      WHEN 'COURIER' THEN 'ON_DELIVERY'::"dbo"."OrderPaymentMethod"
                      ELSE 'IN_STORE'::"dbo"."OrderPaymentMethod" END;

ALTER TABLE "dbo"."Order" ALTER COLUMN "deliveryMethod" SET NOT NULL;
ALTER TABLE "dbo"."Order" ALTER COLUMN "paymentMethod" SET NOT NULL;

ALTER TABLE "dbo"."Order" DROP COLUMN "fulfillmentMethod";
DROP TYPE "dbo"."OrderFulfillmentMethod";
