import { z } from "zod";
import { localizedNameSchema } from "./common";

const abbreviationField = z.string().trim().min(1, "შეავსეთ აბრევიატურა").max(20, "მაქს. 20 სიმბოლო");

export const unitFormSchema = z.object({
  name: localizedNameSchema,
  abbreviation: z.object({
    ka: abbreviationField,
    en: abbreviationField,
    ru: abbreviationField,
  }),
});
