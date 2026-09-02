import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const dashboardOrderSummarySchema = z.object({
  id: z.int(),
  orderCode: z.string(),
  buyerName: z.string(),
  status: lookupItemResponseSchema,
  total: z.number(),
  createdAt: z.iso.datetime(),
});

const dashboardStatusCountSchema = z.object({
  status: lookupItemResponseSchema,
  count: z.int(),
});

const dashboardLowStockItemTypeSchema = z.enum(["PRODUCT_VARIANT", "VEHICLE_LISTING"]);

// id is the product id for PRODUCT_VARIANT rows (variants have no edit page
// of their own — /admin/products/{id} edits every variant at once) and the
// vehicle listing id for VEHICLE_LISTING rows — so it repeats across rows
// whenever one product has several low-stock variants. rowKey is always
// unique (it includes the variant id) and is what list rendering should key
// on instead of `id`.
const dashboardLowStockItemSchema = z.object({
  id: z.int(),
  rowKey: z.string(),
  itemType: dashboardLowStockItemTypeSchema,
  label: z.string(),
  variantLabel: z.string().nullable(),
  stockQuantity: z.int(),
});

export const dashboardStatsResponseSchema = registry.register(
  "DashboardStats",
  z.object({
    counts: z.object({
      totalOrders: z.int().openapi({ example: 128 }),
      totalUsers: z.int().openapi({ example: 340 }),
      totalProducts: z.int().openapi({ example: 56 }),
      totalVehicleListings: z.int().openapi({ example: 12 }),
      activePromoCodes: z.int().openapi({ example: 2 }),
      lowStockCount: z.int().openapi({ example: 5 }),
    }),
    revenueLast30Days: z.number().openapi({ example: 4520.5 }),
    // Same window as revenueLast30Days above (see
    // dashboard.service.ts's getDashboardRecentActivityWindowDays) — a
    // recent-activity snapshot, not a lifetime per-status tally.
    ordersByStatus: z.array(dashboardStatusCountSchema),
    recentOrders: z.array(dashboardOrderSummarySchema),
    lowStockItems: z.array(dashboardLowStockItemSchema),
  }),
);
export type DashboardStats = z.infer<typeof dashboardStatsResponseSchema>;
