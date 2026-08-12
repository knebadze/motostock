import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const suspiciousLoginActivityResponseSchema = registry.register(
  "SuspiciousLoginActivity",
  z.object({
    windowMinutes: z.int(),
    threshold: z.int(),
    byEmail: z.array(z.object({ email: z.string(), count: z.int() })),
    byIp: z.array(z.object({ ipAddress: z.string(), count: z.int() })),
  }),
);
