import { z } from "zod";

// Shared by addresses.schema.ts (per-address contact phone), auth.schema.ts
// (registration — also the walk-in-customer auto-merge key, see
// auth.service.ts's register), and the walk-in-customer creation schema.
// Length-only validation (9-20 chars), no strict regex — the openapi
// example documents the expected E.164-style Georgian convention.
export const phoneField = z
  .string()
  .trim()
  .min(9, "ტელეფონის ნომერი არასწორია")
  .max(20, "ტელეფონის ნომერი არასწორია")
  .openapi({ example: "+995555123456" });
