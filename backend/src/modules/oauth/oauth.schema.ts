import { z } from "zod";
import { registry } from "../../docs/registry.js";

// Validated manually in the controller (not via the generic `validate`
// middleware) — that middleware responds with a JSON error, which would
// break this endpoint's redirect-based flow. On failure the controller
// redirects back to /login?error=oauth_failed instead.
export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;

// Lets the frontend hide a provider's login button entirely instead of
// showing one that's guaranteed to fail — see getOAuthStatus.
export const oauthStatusResponseSchema = registry.register(
  "OAuthStatus",
  z.object({
    google: z.boolean().openapi({ example: false }),
    facebook: z.boolean().openapi({ example: false }),
  }),
);
