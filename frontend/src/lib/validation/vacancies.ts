import { z } from "zod";

const localizedTitleSchema = z.object({
  ka: z.string().trim().min(1, "შეავსეთ სათაური (ქართულად)"),
  en: z.string().trim().min(1, "შეავსეთ სათაური (ინგლისურად)"),
  ru: z.string().trim().min(1, "შეავსეთ სათაური (რუსულად)"),
});

function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim() === "";
}

const localizedDescriptionSchema = z.object({
  ka: z.string().refine((value) => !isBlankHtml(value), "შეავსეთ აღწერა (ქართულად)"),
  en: z.string().refine((value) => !isBlankHtml(value), "შეავსეთ აღწერა (ინგლისურად)"),
  ru: z.string().refine((value) => !isBlankHtml(value), "შეავსეთ აღწერა (რუსულად)"),
});

export const vacancyFormSchema = z.object({
  title: localizedTitleSchema,
  description: localizedDescriptionSchema,
  slug: z
    .string()
    .min(1, "შეავსეთ slug")
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი"),
});
