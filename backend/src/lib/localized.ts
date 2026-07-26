import { z } from "zod";

export const localizedStringSchema = z.object({
  ka: z.string().min(1),
  en: z.string().min(1),
  ru: z.string().min(1),
});
export type LocalizedString = z.infer<typeof localizedStringSchema>;

export const localizedStringPartialSchema = z.object({
  ka: z.string().min(1).optional(),
  en: z.string().min(1).optional(),
  ru: z.string().min(1).optional(),
});
