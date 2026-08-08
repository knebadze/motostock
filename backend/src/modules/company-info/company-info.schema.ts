import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

export const weekDaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

// "10:00" — matches <input type="time">'s native value format.
const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .nullable()
  .optional();

const workingHourInputSchema = z.object({
  dayOfWeek: weekDaySchema,
  isClosed: z.boolean(),
  openTime: timeStringSchema,
  closeTime: timeStringSchema,
});

export const updateCompanyInfoSchema = registry.register(
  "UpdateCompanyInfoInput",
  z.object({
    name: z.string().trim().min(1).max(200).openapi({ example: "MotoStock" }),
    cityId: z.int().positive().nullable().optional(),
    street: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional().openapi({ example: "+995555123456" }),
    email: z.email().nullable().optional(),
    facebookUrl: z.url().nullable().optional(),
    instagramUrl: z.url().nullable().optional(),
    youtubeUrl: z.url().nullable().optional(),
    tiktokUrl: z.url().nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    workingHours: z.array(workingHourInputSchema).max(7).optional(),
  }),
);
export type UpdateCompanyInfoInput = z.infer<typeof updateCompanyInfoSchema>;

const workingHourResponseSchema = registry.register(
  "CompanyWorkingHour",
  z.object({
    dayOfWeek: weekDaySchema,
    isClosed: z.boolean(),
    openTime: z.string().nullable(),
    closeTime: z.string().nullable(),
  }),
);

export const companyInfoResponseSchema = registry.register(
  "CompanyInfo",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: z.string(),
    logoUrl: z.string().nullable(),
    city: lookupItemResponseSchema.nullable(),
    street: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    facebookUrl: z.string().nullable(),
    instagramUrl: z.string().nullable(),
    youtubeUrl: z.string().nullable(),
    tiktokUrl: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    workingHours: z.array(workingHourResponseSchema),
    updatedAt: z.iso.datetime(),
  }),
);
