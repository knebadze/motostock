import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { productResponseSchema } from "../products/products.schema.js";

export const recentlyViewedQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type RecentlyViewedQuery = z.infer<typeof recentlyViewedQuerySchema>;

export const recentlyViewedResponseSchema = registry.register(
  "RecentlyViewedList",
  z.object({ items: z.array(productResponseSchema) }),
);
