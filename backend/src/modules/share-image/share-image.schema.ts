import { z } from "zod";

export const shareImageQuerySchema = z.object({
  src: z.string().min(1).max(500),
});
export type ShareImageQuery = z.infer<typeof shareImageQuerySchema>;
