import { z } from "zod";
import { localizedNameSchema, slugSchema } from "./common";

export const brandFormSchema = z.object({
  name: localizedNameSchema,
  slug: slugSchema,
});
