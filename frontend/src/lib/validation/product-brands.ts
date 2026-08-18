import { z } from "zod";
import { nameSchema, requiredSelectString, slugSchema } from "./common";

export const productBrandFormSchema = z.object({
  categoryId: requiredSelectString("აირჩიეთ კატეგორია"),
  name: nameSchema,
  slug: slugSchema,
});
