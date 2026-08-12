import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const uploadRichTextImageResponseSchema = registry.register(
  "UploadRichTextImageResult",
  z.object({ url: z.string() }),
);
