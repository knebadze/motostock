import { z } from "zod";
import { localizedNameSchema } from "./common";

export const attributeOptionFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "შეავსეთ Key")
    .max(60, "მაქს. 60 სიმბოლო")
    .regex(/^[A-Z0-9_]+$/, "მხოლოდ დიდი ლათინური ასოები, ციფრები და ქვედა ტირე"),
  label: localizedNameSchema,
});
