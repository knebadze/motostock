import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const finaSyncRunResponseSchema = registry.register(
  "FinaSyncRun",
  z.object({
    id: z.int(),
    trigger: z.enum(["SCHEDULED", "MANUAL"]),
    status: z.enum(["SUCCESS", "FAILED", "PARTIAL"]),
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime().nullable(),
    variantsChecked: z.int(),
    variantsUpdated: z.int(),
    errorMessage: z.string().nullable(),
    triggeredBy: z.object({ id: z.int(), name: z.string() }).nullable(),
  }),
);
export type FinaSyncRunResponse = z.infer<typeof finaSyncRunResponseSchema>;
