import { z } from "zod";
import { localizedNameSchema, requiredSelectString } from "./common";

export const attributeFormSchema = z.object({
  categoryId: requiredSelectString("აირჩიეთ კატეგორია"),
  name: localizedNameSchema,
  valueType: requiredSelectString("აირჩიეთ ტიპი"),
});
