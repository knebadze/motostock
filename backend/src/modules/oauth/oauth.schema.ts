import { z } from "zod";

// Validated manually in the controller (not via the generic `validate`
// middleware) — that middleware responds with a JSON error, which would
// break this endpoint's redirect-based flow. On failure the controller
// redirects back to /login?error=oauth_failed instead.
export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
