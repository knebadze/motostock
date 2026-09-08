import { z } from "zod";
import { MAX_DECIMAL_10_2, optionalIntString, requiredPositiveDecimalString } from "./common";

export const productVariantFormSchema = z.object({
  price: requiredPositiveDecimalString("მიუთითეთ ფასი", MAX_DECIMAL_10_2),
  stockQuantity: optionalIntString({ min: 0, message: "მინ. 0" }),
});
