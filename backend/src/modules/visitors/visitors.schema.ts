import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const visitorOverviewResponseSchema = registry.register(
  "VisitorOverview",
  z.object({
    activeNow: z.int(),
    todayVisitors: z.int(),
    weekVisitors: z.int(),
    dailySeries: z.array(z.object({ date: z.iso.date(), visitors: z.int() })),
  }),
);
export type VisitorOverviewResponse = z.infer<typeof visitorOverviewResponseSchema>;
