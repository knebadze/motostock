import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const nameFieldSchema = z.object({
  ka: z.string().trim().min(1).max(60),
  en: z.string().trim().min(1).max(60),
  ru: z.string().trim().min(1).max(60),
});

export const createTeamMemberSchema = registry.register(
  "CreateTeamMemberInput",
  z.object({
    name: nameFieldSchema.openapi({ example: { ka: "გიორგი მელაძე", en: "Giorgi Meladze", ru: "Гиорги Меладзе" } }),
    positionId: z.int().positive(),
    isActive: z.boolean().optional(),
  }),
);
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

export const updateTeamMemberSchema = registry.register(
  "UpdateTeamMemberInput",
  createTeamMemberSchema.partial(),
);
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

export const teamMemberIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reorderTeamMembersSchema = registry.register(
  "ReorderTeamMembersInput",
  z.object({
    ids: z.array(z.int().positive()).min(1),
  }),
);
export type ReorderTeamMembersInput = z.infer<typeof reorderTeamMembersSchema>;

export const teamMemberResponseSchema = registry.register(
  "TeamMember",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: localizedStringSchema,
    positionId: z.int(),
    // Denormalized from the linked Position for display (e.g. the public
    // /about page) without a second lookup fetch.
    role: localizedStringSchema,
    imageUrl: z.string().nullable(),
    isActive: z.boolean(),
    sortOrder: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);
