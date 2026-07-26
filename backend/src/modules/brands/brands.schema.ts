import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "honda" });

const localizedNameField = localizedStringSchema.openapi({
  example: { ka: "ჰონდა", en: "Honda", ru: "Хонда" },
});

export const createBrandSchema = registry.register(
  "CreateBrandInput",
  z.object({
    name: localizedNameField,
    slug: slugField,
  }),
);
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = registry.register(
  "UpdateBrandInput",
  createBrandSchema.partial(),
);
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const brandIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type BrandIdParam = z.infer<typeof brandIdParamSchema>;

export const brandResponseSchema = registry.register(
  "Brand",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: localizedNameField,
    slug: z.string().openapi({ example: "honda" }),
    logoUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
