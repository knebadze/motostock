import { z } from "zod";
import { nameSchema, slugSchema } from "./common";

export const productBrandFormSchema = z.object({
  // A brand can sell into several unrelated categories at once (e.g.
  // Alpinestars: gloves, jackets, helmets) — see prisma/models/product-brand.prisma.
  categoryIds: z.array(z.string()).min(1, "აირჩიეთ მინიმუმ ერთი კატეგორია"),
  name: nameSchema,
  slug: slugSchema,
});
