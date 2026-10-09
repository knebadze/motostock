import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { COOKIE_SECURE } from "../../lib/cookies.js";
import { setAuthCookie } from "../../lib/jwt.js";
import { getClientIp, getClientUserAgent } from "../../lib/request-ip.js";
import { mergeGuestDataIntoUser } from "../../middleware/guest-identity.middleware.js";
import { recordAuthEvent } from "../fraud/fraud.service.js";
import {
  getFacebookAuthUrl,
  getGoogleAuthUrl,
  isFacebookConfigured,
  isGoogleConfigured,
} from "./oauth-providers.js";
import { loginWithFacebook, loginWithGoogle } from "./oauth.service.js";
import { oauthCallbackQuerySchema } from "./oauth.schema.js";

const STATE_COOKIE_NAME = "oauth_state";
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
// Where to send the user after the provider round-trip (e.g. /checkout when
// login was prompted from there) — kept in its own short-lived cookie, since
// the provider only echoes `state` back.
const REDIRECT_COOKIE_NAME = "oauth_redirect";

const shortLivedCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: "lax" as const,
  maxAge: STATE_COOKIE_MAX_AGE_MS,
};

function setStateCookie(res: Response, state: string) {
  res.cookie(STATE_COOKIE_NAME, state, shortLivedCookieOptions);
}

// Same rule as the frontend's lib/auth-redirect.ts: a same-site relative
// path only — not "//host" or "/\host" (browsers read a backslash as a
// slash, making both protocol-relative = another site), no control chars.
// It's appended to FRONTEND_ORIGIN, so anything else would be an open
// redirect.
function isSafeRedirectPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return false;
  if (!value.startsWith("/") || value[1] === "/" || value[1] === "\\") return false;
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "\\" || code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

function rememberRedirect(req: Request, res: Response) {
  const redirect = req.query.redirect;
  if (isSafeRedirectPath(redirect)) {
    res.cookie(REDIRECT_COOKIE_NAME, redirect, shortLivedCookieOptions);
  } else {
    res.clearCookie(REDIRECT_COOKIE_NAME);
  }
}

// Reads and clears the remembered target — one use per login attempt.
function takeRedirect(req: Request, res: Response): string | null {
  const redirect: unknown = req.cookies?.[REDIRECT_COOKIE_NAME];
  res.clearCookie(REDIRECT_COOKIE_NAME);
  return isSafeRedirectPath(redirect) ? redirect : null;
}

function failureRedirect(res: Response, error: unknown = null, redirect: string | null = null) {
  // Distinguished from the generic failure so the frontend can show a
  // specific, actionable message — see oauth.service.ts's
  // findOrCreateOAuthUser and LoginForm.tsx's matching error-code handling.
  const reason =
    error instanceof ApiError && error.message === "OAUTH_EMAIL_HAS_PASSWORD"
      ? "oauth_email_has_password"
      : error instanceof ApiError && error.message === "OAUTH_EMAIL_EXISTS"
        ? "oauth_email_exists"
        : "oauth_failed";
  // Keep ?redirect= so a retry from the login page still returns there.
  const redirectQuery = redirect ? `&redirect=${encodeURIComponent(redirect)}` : "";
  res.redirect(`${env.FRONTEND_ORIGIN}/login?error=${reason}${redirectQuery}`);
}

// Hashing both sides to a fixed 32-byte digest first means
// crypto.timingSafeEqual never has to branch on the two inputs' raw
// lengths (it throws on a length mismatch) — comparing digests instead of
// the raw state strings keeps this constant-time regardless of what an
// attacker sends as ?state=.
function statesMatch(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const receivedHash = crypto.createHash("sha256").update(received).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(receivedHash, expectedHash);
}

export function getOAuthStatus(req: Request, res: Response) {
  res.status(200).json({ google: isGoogleConfigured(), facebook: isFacebookConfigured() });
}

// Both throw-sites below used to `throw new ApiError(400, ...)` — fine for
// most of this codebase's JSON-API routes, but these two are reached by a
// full browser navigation (the "Continue with Google/Facebook" link), not
// an SPA fetch call. A throw here renders as raw, untranslated JSON in the
// browser instead of going through the frontend's error UI at all — see
// failureRedirect below, which every other failure path in this module
// already goes through. Redirecting here instead closes that gap; the
// frontend also hides these buttons entirely when misconfigured (see
// getOAuthStatus / OAuthButtons.tsx) so this is a defense-in-depth
// fallback, not the primary guard.
export function redirectToGoogle(req: Request, res: Response) {
  if (!isGoogleConfigured()) {
    failureRedirect(res);
    return;
  }
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);
  rememberRedirect(req, res);
  res.redirect(getGoogleAuthUrl(state));
}

export function redirectToFacebook(req: Request, res: Response) {
  if (!isFacebookConfigured()) {
    failureRedirect(res);
    return;
  }
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);
  rememberRedirect(req, res);
  res.redirect(getFacebookAuthUrl(state));
}

export async function handleGoogleCallback(req: Request, res: Response) {
  const parsed = oauthCallbackQuerySchema.safeParse(req.query);
  const cookieState = req.cookies?.[STATE_COOKIE_NAME];
  res.clearCookie(STATE_COOKIE_NAME);
  const redirect = takeRedirect(req, res);

  if (!parsed.success || !parsed.data.code || !statesMatch(parsed.data.state, cookieState)) {
    failureRedirect(res, null, redirect);
    return;
  }

  try {
    const { user, token } = await loginWithGoogle(
      parsed.data.code,
      getClientIp(req),
      getClientUserAgent(req),
    );
    await setAuthCookie(res, token);
    await mergeGuestDataIntoUser(req, res, user.id);
    await recordAuthEvent("LOGIN_SUCCESS", user.email, user.id, getClientIp(req));
    res.redirect(`${env.FRONTEND_ORIGIN}${redirect ?? "/account"}`);
  } catch (error) {
    failureRedirect(res, error, redirect);
  }
}

export async function handleFacebookCallback(req: Request, res: Response) {
  const parsed = oauthCallbackQuerySchema.safeParse(req.query);
  const cookieState = req.cookies?.[STATE_COOKIE_NAME];
  res.clearCookie(STATE_COOKIE_NAME);
  const redirect = takeRedirect(req, res);

  if (!parsed.success || !parsed.data.code || !statesMatch(parsed.data.state, cookieState)) {
    failureRedirect(res, null, redirect);
    return;
  }

  try {
    const { user, token } = await loginWithFacebook(
      parsed.data.code,
      getClientIp(req),
      getClientUserAgent(req),
    );
    await setAuthCookie(res, token);
    await mergeGuestDataIntoUser(req, res, user.id);
    await recordAuthEvent("LOGIN_SUCCESS", user.email, user.id, getClientIp(req));
    res.redirect(`${env.FRONTEND_ORIGIN}${redirect ?? "/account"}`);
  } catch (error) {
    failureRedirect(res, error, redirect);
  }
}
