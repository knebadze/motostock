import { z } from "zod";
import { nameSchema, requiredSelectString, slugSchema } from "./common";

export const modelFormSchema = z.object({
  brandId: requiredSelectString("აირჩიეთ მარკა"),
  categoryId: requiredSelectString("აირჩიეთ ტიპი (კატეგორია)"),
  name: nameSchema,
  slug: slugSchema,
});
