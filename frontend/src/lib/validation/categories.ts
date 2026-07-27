import { z } from "zod";
import { localizedNameSchema, slugSchema } from "./common";

export const categoryFormSchema = z.object({
  name: localizedNameSchema,
  slug: slugSchema,
});
