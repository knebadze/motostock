import { z } from "zod";
import { optionalIntString, requiredPositiveDecimalString } from "./common";

export const productVariantFormSchema = z.object({
  price: requiredPositiveDecimalString("მიუთითეთ ფასი"),
  stockQuantity: optionalIntString({ min: 1, message: "მინ. 1" }),
});
