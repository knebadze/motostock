import { z } from "zod";

export const bulkProductDiscountFormSchema = z
  .object({
    // 100 rejected, not just capped — mirrors bulk-product-discounts.schema.ts's
    // backend constraint (a stray 100 zeroes out every selected variant's
    // discountPrice at once).
    discountPercent: z
      .string()
      .refine(
        (value) =>
          value.trim() !== "" && !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 99,
        { message: "0-99 შუალედში" },
      ),
    startDate: z.string().trim().min(1, "აირჩიეთ დაწყების თარიღი"),
    endDate: z.string().trim().min(1, "აირჩიეთ დასრულების თარიღი"),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
    path: ["endDate"],
  });
