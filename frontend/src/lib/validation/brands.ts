import { z } from "zod";
import { nameSchema, slugSchema } from "./common";

export const brandFormSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
});
