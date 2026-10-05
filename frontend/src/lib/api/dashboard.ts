import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type DashboardLowStockItemType = "PRODUCT_VARIANT" | "VEHICLE_LISTING";

export type DashboardSalesSummary = DashboardStats["salesToday"];

export type DashboardStats = Schemas["DashboardStats"];
