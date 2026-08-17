import { z } from "zod";

const localizedQuestionSchema = z.object({
  ka: z.string().trim().min(1, "შეავსეთ კითხვა (ქართულად)"),
  en: z.string().trim().min(1, "შეავსეთ კითხვა (ინგლისურად)"),
  ru: z.string().trim().min(1, "შეავსეთ კითხვა (რუსულად)"),
});

function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim() === "";
}

const localizedAnswerSchema = z.object({
  ka: z.string().refine((value) => !isBlankHtml(value), "შეავსეთ პასუხი (ქართულად)"),
  en: z.string().refine((value) => !isBlankHtml(value), "შეავსეთ პასუხი (ინგლისურად)"),
  ru: z.string().refine((value) => !isBlankHtml(value), "შეავსეთ პასუხი (რუსულად)"),
});

export const faqFormSchema = z.object({
  question: localizedQuestionSchema,
  answer: localizedAnswerSchema,
});
