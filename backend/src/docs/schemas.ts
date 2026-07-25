import { z } from "zod";
import { registry } from "./registry.js";

export const userResponseSchema = registry.register(
  "User",
  z.object({
    id: z.string().openapi({ example: "cms0cyxdh0000d4uadh5vnt3e" }),
    email: z.email().openapi({ example: "rider@motostock.ge" }),
    name: z.string().openapi({ example: "Nika Beridze" }),
    role: z.enum(["USER", "ADMIN"]),
    createdAt: z.iso.datetime(),
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
