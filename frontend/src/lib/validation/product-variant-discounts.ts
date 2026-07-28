import { z } from "zod";
import { requiredPositiveDecimalString } from "./common";

export const productVariantDiscountFormSchema = z
  .object({
    discountPrice: requiredPositiveDecimalString("მიუთითეთ ფასდაკლების ფასი"),
    discountPercent: z
      .string()
      .refine(
        (value) =>
          value.trim() === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100),
        { message: "0-100 შუალედში" },
      ),
    startDate: z.string().trim().min(1, "აირჩიეთ დაწყების თარიღი"),
    endDate: z.string().trim().min(1, "აირჩიეთ დასრულების თარიღი"),
  })
  .refine((data) => data.startDate.trim() === "" || new Date(data.endDate) > new Date(data.startDate), {
    message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
    path: ["endDate"],
  });
