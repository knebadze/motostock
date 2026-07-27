import { z } from "zod";
import { localizedNameSchema, requiredSelectString, slugSchema } from "./common";

export const modelFormSchema = z.object({
  brandId: requiredSelectString("აირჩიეთ მარკა"),
  categoryId: requiredSelectString("აირჩიეთ ტიპი (კატეგორია)"),
  name: localizedNameSchema,
  slug: slugSchema,
});
