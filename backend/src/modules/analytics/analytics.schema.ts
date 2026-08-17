import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

export const analyticsQuerySchema = z.object({
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

const demandRowSchema = z.object({
  id: z.int(),
  viewCount: z.int(),
  wishlistCount: z.int(),
  cartCount: z.int(),
  quantitySold: z.int(),
  revenue: z.number(),
});

const productDemandRowSchema = demandRowSchema.extend({ nameKa: z.string() });
const vehicleListingDemandRowSchema = demandRowSchema.extend({ label: z.string() });

const orderStatusCountSchema = z.object({
  status: lookupItemResponseSchema,
  count: z.int(),
});

const cancellationReasonCountSchema = z.object({
  reason: lookupItemResponseSchema.nullable(),
  count: z.int(),
});

const recentCancelledOrderSchema = z.object({
  id: z.int(),
  orderCode: z.string(),
  buyerName: z.string(),
  buyerEmail: z.string(),
  total: z.number(),
  reason: lookupItemResponseSchema.nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const analyticsOverviewResponseSchema = registry.register(
  "AnalyticsOverview",
  z.object({
    range: z.object({ from: z.iso.datetime(), to: z.iso.datetime() }),
    financial: z.object({
      revenue: z.number(),
      orderCount: z.int(),
      cancelledCount: z.int(),
      cancellationRate: z.number(),
      lostRevenue: z.number(),
    }),
    revenueSeries: z.array(z.object({ date: z.iso.date(), revenue: z.number() })),
    ordersByStatus: z.array(orderStatusCountSchema),
    topProducts: z.array(productDemandRowSchema),
    topVehicleListings: z.array(vehicleListingDemandRowSchema),
    cancellations: z.object({
      reasonBreakdown: z.array(cancellationReasonCountSchema),
      recentOrders: z.array(recentCancelledOrderSchema),
    }),
  }),
);
export type AnalyticsOverviewResponse = z.infer<typeof analyticsOverviewResponseSchema>;
