import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const createBankSchema = registry.register(
  "CreateBankInput",
  z.object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .regex(/^[A-Z0-9_]+$/, "მხოლოდ დიდი ლათინური ასოები, ციფრები და ხაზი (_)"),
    name: localizedStringSchema,
    isActive: z.boolean().optional(),
    supportsInstallment: z.boolean().optional(),
    supportsSplitPayment: z.boolean().optional(),
  }),
);
export type CreateBankInput = z.infer<typeof createBankSchema>;

export const updateBankSchema = registry.register(
  "UpdateBankInput",
  createBankSchema.partial(),
);
export type UpdateBankInput = z.infer<typeof updateBankSchema>;

export const bankIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reorderBanksSchema = registry.register(
  "ReorderBanksInput",
  z.object({
    ids: z.array(z.int().positive()).min(1),
  }),
);
export type ReorderBanksInput = z.infer<typeof reorderBanksSchema>;

export const bankResponseSchema = registry.register(
  "Bank",
  z.object({
    id: z.int().openapi({ example: 1 }),
    key: z.string().openapi({ example: "TBC" }),
    name: localizedStringSchema,
    logoUrl: z.string().nullable(),
    isActive: z.boolean(),
    sortOrder: z.int(),
    supportsInstallment: z.boolean(),
    supportsSplitPayment: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

// What the checkout page gets — a customer never needs to see (or should
// be able to see) credentials.
export const publicBankResponseSchema = registry.register(
  "PublicBank",
  z.object({
    id: z.int().openapi({ example: 1 }),
    key: z.string().openapi({ example: "TBC" }),
    name: localizedStringSchema,
    logoUrl: z.string().nullable(),
  }),
);
