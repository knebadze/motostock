-- fraud.repository.ts's per-IP lookup on every checkout (see order.prisma).
CREATE INDEX "Order_ipAddress_idx" ON "dbo"."Order"("ipAddress");
