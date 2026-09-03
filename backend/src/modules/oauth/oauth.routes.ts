import { Router } from "express";
import { authRateLimit } from "../../middleware/rateLimit.middleware.js";
import { registry } from "../../docs/registry.js";
import {
  getOAuthStatus,
  handleFacebookCallback,
  handleGoogleCallback,
  redirectToFacebook,
  redirectToGoogle,
} from "./oauth.controller.js";
import { oauthStatusResponseSchema } from "./oauth.schema.js";

export const oauthRouter = Router();

// Public — lets the frontend hide a provider's button instead of showing
// one that's guaranteed to fail (see OAuthButtons.tsx).
oauthRouter.get("/oauth-status", getOAuthStatus);

oauthRouter.get("/google", authRateLimit, redirectToGoogle);
// Rate-limited the same as /google above — this is the step that actually
// calls out to Google's token endpoint with whatever `code` query param
// shows up, so leaving it unlimited would let a script hammering this URL
// with garbage codes drive unbounded outbound requests to Google on our
// server's behalf (an amplification vector), on top of burning our own
// request-handling capacity.
oauthRouter.get("/google/callback", authRateLimit, handleGoogleCallback);
oauthRouter.get("/facebook", authRateLimit, redirectToFacebook);
oauthRouter.get("/facebook/callback", authRateLimit, handleFacebookCallback);

registry.registerPath({
  method: "get",
  path: "/auth/oauth-status",
  tags: ["Auth"],
  summary: "Get whether Google/Facebook OAuth login is configured (public)",
  responses: {
    200: {
      description: "OAuth configuration status",
      content: { "application/json": { schema: oauthStatusResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/google",
  tags: ["Auth"],
  summary: "Start Google OAuth login (redirects to Google's consent screen)",
  responses: {
    302: {
      description:
        "Redirect to Google, or to /login?error=oauth_failed if Google OAuth isn't configured",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/google/callback",
  tags: ["Auth"],
  summary: "Google OAuth callback — completes login and redirects back to the site",
  responses: {
    302: {
      description:
        "Redirect back to the site (logged in; or to /login?error=oauth_failed on failure, or /login?error=oauth_email_has_password when the email already has a password-protected account and won't be auto-linked)",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/facebook",
  tags: ["Auth"],
  summary: "Start Facebook OAuth login (redirects to Facebook's consent screen)",
  responses: {
    302: {
      description:
        "Redirect to Facebook, or to /login?error=oauth_failed if Facebook OAuth isn't configured",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/facebook/callback",
  tags: ["Auth"],
  summary: "Facebook OAuth callback — completes login and redirects back to the site",
  responses: {
    302: {
      description:
        "Redirect back to the site (logged in; or to /login?error=oauth_failed on failure, or /login?error=oauth_email_has_password when the email already has a password-protected account and won't be auto-linked)",
    },
  },
});
