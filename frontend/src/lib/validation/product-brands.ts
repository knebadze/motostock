import { z } from "zod";
import { localizedNameSchema, requiredSelectString, slugSchema } from "./common";

export const productBrandFormSchema = z.object({
  categoryId: requiredSelectString("აირჩიეთ კატეგორია"),
  name: localizedNameSchema,
  slug: slugSchema,
});
