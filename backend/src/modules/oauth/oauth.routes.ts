import { Router } from "express";
import { authRateLimit } from "../../middleware/rateLimit.middleware.js";
import { registry } from "../../docs/registry.js";
import {
  handleFacebookCallback,
  handleGoogleCallback,
  redirectToFacebook,
  redirectToGoogle,
} from "./oauth.controller.js";

export const oauthRouter = Router();

oauthRouter.get("/google", authRateLimit, redirectToGoogle);
oauthRouter.get("/google/callback", handleGoogleCallback);
oauthRouter.get("/facebook", authRateLimit, redirectToFacebook);
oauthRouter.get("/facebook/callback", handleFacebookCallback);

registry.registerPath({
  method: "get",
  path: "/auth/google",
  tags: ["Auth"],
  summary: "Start Google OAuth login (redirects to Google's consent screen)",
  responses: {
    302: { description: "Redirect to Google" },
    400: { description: "Google OAuth not configured" },
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
    302: { description: "Redirect to Facebook" },
    400: { description: "Facebook OAuth not configured" },
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
