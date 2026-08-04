import { z } from "zod";

// Keeps the slide's text block from overflowing/wrapping awkwardly over the
// background image — also enforced backend-side, these mirror those limits
// so the form's live character counters match what the server will accept.
export const HERO_SLIDE_TITLE_MAX_LENGTH = 60;
export const HERO_SLIDE_SUBTITLE_MAX_LENGTH = 120;
export const HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH = 30;

const TYPES_WITH_BUTTON_LABEL = new Set(["CTA", "DISCOUNT"]);

export const heroSlideFormSchema = z
  .object({
    type: z.enum(["CTA", "VEHICLE_SEARCH", "INFO", "CATEGORY_FILTER", "DISCOUNT"]),
    title: z.object({
      ka: z.string().trim().min(1, "შეავსეთ სათაური (ქართულად)").max(HERO_SLIDE_TITLE_MAX_LENGTH),
      en: z.string().trim().min(1, "შეავსეთ სათაური (ინგლისურად)").max(HERO_SLIDE_TITLE_MAX_LENGTH),
      ru: z.string().trim().min(1, "შეავსეთ სათაური (რუსულად)").max(HERO_SLIDE_TITLE_MAX_LENGTH),
    }),
    subtitleKa: z.string().max(HERO_SLIDE_SUBTITLE_MAX_LENGTH),
    subtitleEn: z.string().max(HERO_SLIDE_SUBTITLE_MAX_LENGTH),
    subtitleRu: z.string().max(HERO_SLIDE_SUBTITLE_MAX_LENGTH),
    buttonLabelKa: z.string().max(HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH),
    buttonLabelEn: z.string().max(HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH),
    buttonLabelRu: z.string().max(HERO_SLIDE_BUTTON_LABEL_MAX_LENGTH),
    buttonLink: z.string(),
  })
  // Button-text is required for CTA and DISCOUNT slides; CTA additionally
  // requires a hand-typed link (DISCOUNT's link is always computed) — can't
  // express either with plain per-field schemas since both depend on `type`.
  .superRefine((data, ctx) => {
    if (TYPES_WITH_BUTTON_LABEL.has(data.type)) {
      if (!data.buttonLabelKa.trim()) {
        ctx.addIssue({ code: "custom", path: ["buttonLabelKa"], message: "შეავსეთ ღილაკის ტექსტი (ქართულად)" });
      }
      if (!data.buttonLabelEn.trim()) {
        ctx.addIssue({ code: "custom", path: ["buttonLabelEn"], message: "შეავსეთ ღილაკის ტექსტი (ინგლისურად)" });
      }
      if (!data.buttonLabelRu.trim()) {
        ctx.addIssue({ code: "custom", path: ["buttonLabelRu"], message: "შეავსეთ ღილაკის ტექსტი (რუსულად)" });
      }
    }
    if (data.type === "CTA" && !data.buttonLink.trim()) {
      ctx.addIssue({ code: "custom", path: ["buttonLink"], message: "შეავსეთ ღილაკის ბმული" });
    }
  });
