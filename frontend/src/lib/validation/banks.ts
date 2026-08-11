import { z } from "zod";
import { localizedNameSchema } from "./common";

export const bankFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "შეავსეთ იდენტიფიკატორი")
    .max(30, "მაქს. 30 სიმბოლო")
    .regex(/^[A-Z0-9_]+$/, "მხოლოდ დიდი ლათინური ასოები, ციფრები და ხაზი (_)"),
  name: localizedNameSchema,
});
