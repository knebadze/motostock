import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const orderStatusIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const keyField = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[A-Z0-9_]+$/, "მხოლოდ დიდი ლათინური ასოები, ციფრები და ქვედა ტირე")
  .openapi({ example: "PENDING" });

export const createOrderStatusSchema = registry.register(
  "CreateOrderStatusInput",
  z.object({
    key: keyField,
    nameKa: z.string().min(1).openapi({ example: "მუშავდება" }),
    nameEn: z.string().min(1).openapi({ example: "Processing" }),
    nameRu: z.string().min(1).openapi({ example: "В обработке" }),
  }),
);
export type CreateOrderStatusInput = z.infer<typeof createOrderStatusSchema>;

// sortOrder is edited via the up/down move action (moveOrderStatusSchema
// below — one atomic swap, same as HomepageSection's moveHomepageSection),
// not a free-typed field in the create/edit form.
export const updateOrderStatusItemSchema = registry.register(
  "UpdateOrderStatusItemInput",
  createOrderStatusSchema.partial(),
);
export type UpdateOrderStatusItemInput = z.infer<typeof updateOrderStatusItemSchema>;

export const moveOrderStatusSchema = registry.register(
  "MoveOrderStatusInput",
  z.object({
    direction: z.enum(["up", "down"]),
  }),
);
export type MoveOrderStatusInput = z.infer<typeof moveOrderStatusSchema>;

export const orderStatusResponseSchema = registry.register(
  "OrderStatusItem",
  z.object({
    id: z.int().openapi({ example: 1 }),
    key: z.string(),
    nameKa: z.string(),
    nameEn: z.string(),
    nameRu: z.string(),
    sortOrder: z.int(),
  }),
);
