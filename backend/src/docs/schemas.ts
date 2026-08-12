import { z } from "zod";
import { registry } from "./registry.js";

export const userResponseSchema = registry.register(
  "User",
  z.object({
    id: z.int().openapi({ example: 1 }),
    email: z.email().openapi({ example: "rider@motostock.ge" }),
    name: z.string().openapi({ example: "Nika Beridze" }),
    role: z.enum(["USER", "ADMIN"]),
    createdAt: z.iso.datetime(),
    emailVerified: z.boolean(),
  }),
);

export const errorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    error: z.object({
      message: z.string().openapi({ example: "Invalid email or password" }),
      details: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional(),
    }),
  }),
);
