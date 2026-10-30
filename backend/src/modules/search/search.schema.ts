import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const searchSuggestQuerySchema = z.object({
  q: z.string().trim().min(2).max(100).openapi({ example: "ჩაფხუტი" }),
});
export type SearchSuggestQuery = z.infer<typeof searchSuggestQuerySchema>;

const suggestProductSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  slug: z.string(),
  categorySlug: z.string(),
  categoryName: localizedStringSchema,
  imageUrl: z.string().nullable(),
  // Lowest variant price, and the cheapest active discount price (if any).
  price: z.number().nullable(),
  discountPrice: z.number().nullable(),
});

const suggestVehicleListingSchema = z.object({
  id: z.int(),
  title: z.string(),
  year: z.int(),
  categorySlug: z.string(),
  categoryName: localizedStringSchema,
  // Same shape as the frontend's buildVehicleListingSlug.
  itemSlug: z.string(),
  imageUrl: z.string().nullable(),
  price: z.number(),
  discountPrice: z.number().nullable(),
  priceCurrency: z.enum(["GEL", "USD"]),
});

const suggestCategorySchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  slug: z.string(),
  parentName: localizedStringSchema.nullable(),
});

export const searchSuggestResponseSchema = registry.register(
  "SearchSuggestions",
  z.object({
    products: z.array(suggestProductSchema),
    vehicleListings: z.array(suggestVehicleListingSchema),
    categories: z.array(suggestCategorySchema),
  }),
);
