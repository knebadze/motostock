import { z } from "zod";
import { localizedNameSchema, requiredSelectString, slugSchema } from "./common";
import type { Attribute } from "@/lib/api/attributes";

export const productFormSchema = z.object({
  categoryId: requiredSelectString("აირჩიეთ კატეგორია"),
  name: localizedNameSchema,
  slug: slugSchema,
  metaTitle: z.string().max(70, "მაქს. 70 სიმბოლო").optional(),
  metaDescription: z.string().max(200, "მაქს. 200 სიმბოლო").optional(),
});

// Attribute inputs are rendered dynamically per category (see
// ProductAttributeFields), so their validation has to be built at runtime
// from the same attribute list rather than a static schema — required-ness
// and type come from each Attribute's own `required`/`valueType`.
export type AttributeFieldValue = {
  text: string;
  number: string;
  boolean: boolean;
  optionId: string;
};

export function buildAttributeValuesSchema(attributes: Attribute[]) {
  const shape: Record<string, z.ZodType<AttributeFieldValue>> = {};

  for (const attribute of attributes) {
    shape[String(attribute.id)] = z
      .object({
        text: z.string(),
        number: z.string(),
        boolean: z.boolean(),
        optionId: z.string(),
      })
      .superRefine((value, ctx) => {
        if (!attribute.required) return;

        const isEmpty =
          attribute.valueType === "TEXT"
            ? value.text.trim() === ""
            : attribute.valueType === "NUMBER"
              ? value.number.trim() === ""
              : attribute.valueType === "SELECT"
                ? value.optionId.trim() === ""
                : false; // BOOLEAN is never "empty" — false is a valid value

        if (isEmpty) {
          ctx.addIssue({ code: "custom", message: "სავალდებულო ველია" });
        }

        if (attribute.valueType === "NUMBER" && value.number.trim() !== "" && Number.isNaN(Number(value.number))) {
          ctx.addIssue({ code: "custom", message: "არასწორი რიცხვი" });
        }
      });
  }

  return z.object(shape);
}
