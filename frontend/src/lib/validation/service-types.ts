import { z } from "zod";
import { localizedNameSchema } from "./common";

export const serviceTypeFormSchema = z.object({
  name: localizedNameSchema,
});
