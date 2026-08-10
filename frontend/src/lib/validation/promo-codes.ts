import { z } from "zod";
import { optionalIntString } from "./common";

const codeSchema = z
  .string()
  .trim()
  .min(3, "მინიმუმ 3 სიმბოლო")
  .max(30, "მაქს. 30 სიმბოლო")
  .regex(/^[A-Za-z0-9_-]+$/, "მხოლოდ ლათინური ასოები, ციფრები, - და _");

const commonFields = {
  code: codeSchema,
  discountPercent: z
    .string()
    .refine(
      (value) =>
        value.trim() !== "" && !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 100,
      { message: "0-100 შუალედში" },
    ),
  // Empty means unlimited — see PromoCode.usageLimit.
  usageLimit: optionalIntString({ min: 1, message: "მინიმუმ 1" }),
  startDate: z.string().trim().min(1, "აირჩიეთ დაწყების თარიღი"),
  endDate: z.string().trim().min(1, "აირჩიეთ დასრულების თარიღი"),
};

export const productPromoCodeFormSchema = z
  .object({
    ...commonFields,
    categoryId: z.string(),
    productBrandId: z.string(),
    attributeId: z.string(),
    attributeOptionId: z.string(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
    path: ["endDate"],
  })
  .refine((data) => (data.attributeId.trim() === "") === (data.attributeOptionId.trim() === ""), {
    message: "მახასიათებელი და მნიშვნელობა ერთად არის საჭირო",
    path: ["attributeOptionId"],
  })
  .refine((data) => data.attributeId.trim() === "" || data.categoryId.trim() !== "", {
    message: "მახასიათებლის მითითებისთვის საჭიროა კატეგორიაც",
    path: ["categoryId"],
  });

export const vehiclePromoCodeFormSchema = z
  .object({
    ...commonFields,
    categoryId: z.string(),
    brandId: z.string(),
    modelId: z.string(),
    specField: z.string(),
    specLookupItemId: z.string(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
    path: ["endDate"],
  })
  .refine((data) => (data.specField.trim() === "") === (data.specLookupItemId.trim() === ""), {
    message: "მახასიათებელი და მნიშვნელობა ერთად არის საჭირო",
    path: ["specLookupItemId"],
  })
  .refine((data) => data.modelId.trim() === "" || data.categoryId.trim() !== "", {
    message: "მოდელის მითითებისთვის საჭიროა კატეგორიაც",
    path: ["categoryId"],
  });
