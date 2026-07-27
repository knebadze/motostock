import { z } from "zod";

export type FieldErrors = Record<string, string>;

// zod issue paths are string|number segments (e.g. ["name", "ka"] for a
// nested field) — join them so nested errors surface under a single flat key
// that matches how these forms track per-field state (errors["name.ka"]).
export function getFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

export const localizedNameSchema = z.object({
  ka: z.string().trim().min(1, "შეავსეთ სახელი (ქართულად)"),
  en: z.string().trim().min(1, "შეავსეთ სახელი (ინგლისურად)"),
  ru: z.string().trim().min(1, "შეავსეთ სახელი (რუსულად)"),
});

export const slugSchema = z
  .string()
  .trim()
  .min(1, "შეავსეთ slug")
  .max(120, "მაქს. 120 სიმბოლო")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი");

export function requiredSelectString(message = "აირჩიეთ მნიშვნელობა") {
  return z.string().trim().min(1, message);
}

export function optionalIntString(opts: { min?: number; max?: number; message?: string } = {}) {
  return z.string().refine(
    (value) => {
      if (value.trim() === "") return true;
      const n = Number(value);
      if (!Number.isInteger(n)) return false;
      if (opts.min != null && n < opts.min) return false;
      if (opts.max != null && n > opts.max) return false;
      return true;
    },
    { message: opts.message ?? "არასწორი მნიშვნელობა" },
  );
}

export function requiredIntString(opts: { min?: number; max?: number; message?: string } = {}) {
  return z.string().refine(
    (value) => {
      if (value.trim() === "") return false;
      const n = Number(value);
      if (!Number.isInteger(n)) return false;
      if (opts.min != null && n < opts.min) return false;
      if (opts.max != null && n > opts.max) return false;
      return true;
    },
    { message: opts.message ?? "სავალდებულო ველია" },
  );
}

export function optionalPositiveDecimalString(message = "არასწორი მნიშვნელობა") {
  return z
    .string()
    .refine((value) => value.trim() === "" || (!Number.isNaN(Number(value)) && Number(value) > 0), {
      message,
    });
}

export function requiredPositiveDecimalString(message = "სავალდებულო ველია") {
  return z
    .string()
    .refine((value) => value.trim() !== "" && !Number.isNaN(Number(value)) && Number(value) > 0, {
      message,
    });
}
