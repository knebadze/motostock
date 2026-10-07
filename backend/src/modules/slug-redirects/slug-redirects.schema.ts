import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const slugRedirectParamSchema = z.object({
  slug: z.string().min(1).max(300),
});
export type SlugRedirectParams = z.infer<typeof slugRedirectParamSchema>;

export const productSlugRedirectResponseSchema = registry.register(
  "ProductSlugRedirect",
  z.object({
    slug: z.string().openapi({ example: "brembo-brake-pads" }),
    categorySlug: z.string().openapi({ example: "brake-pads" }),
  }),
);

export const categorySlugRedirectResponseSchema = registry.register(
  "CategorySlugRedirect",
  z.object({
    slug: z.string().openapi({ example: "helmets" }),
  }),
);
