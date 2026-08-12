import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { setAuthCookie } from "../../lib/jwt.js";
import { getClientIp } from "../../lib/request-ip.js";
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

function setStateCookie(res: Response, state: string) {
  res.cookie(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_COOKIE_MAX_AGE_MS,
  });
}

function failureRedirect(res: Response) {
  res.redirect(`${env.FRONTEND_ORIGIN}/login?error=oauth_failed`);
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

export function redirectToGoogle(req: Request, res: Response) {
  if (!isGoogleConfigured()) {
    throw new ApiError(400, "Google-ით ავტორიზაცია არ არის კონფიგურირებული");
  }
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);
  res.redirect(getGoogleAuthUrl(state));
}

export function redirectToFacebook(req: Request, res: Response) {
  if (!isFacebookConfigured()) {
    throw new ApiError(400, "Facebook-ით ავტორიზაცია არ არის კონფიგურირებული");
  }
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);
  res.redirect(getFacebookAuthUrl(state));
}

export async function handleGoogleCallback(req: Request, res: Response) {
  const parsed = oauthCallbackQuerySchema.safeParse(req.query);
  const cookieState = req.cookies?.[STATE_COOKIE_NAME];
  res.clearCookie(STATE_COOKIE_NAME);

  if (!parsed.success || !parsed.data.code || !statesMatch(parsed.data.state, cookieState)) {
    failureRedirect(res);
    return;
  }

  try {
    const { user, token } = await loginWithGoogle(parsed.data.code);
    setAuthCookie(res, token);
    await mergeGuestDataIntoUser(req, res, user.id);
    await recordAuthEvent("LOGIN_SUCCESS", user.email, user.id, getClientIp(req));
    res.redirect(`${env.FRONTEND_ORIGIN}/account`);
  } catch {
    failureRedirect(res);
  }
}

export async function handleFacebookCallback(req: Request, res: Response) {
  const parsed = oauthCallbackQuerySchema.safeParse(req.query);
  const cookieState = req.cookies?.[STATE_COOKIE_NAME];
  res.clearCookie(STATE_COOKIE_NAME);

  if (!parsed.success || !parsed.data.code || !statesMatch(parsed.data.state, cookieState)) {
    failureRedirect(res);
    return;
  }

  try {
    const { user, token } = await loginWithFacebook(parsed.data.code);
    setAuthCookie(res, token);
    await mergeGuestDataIntoUser(req, res, user.id);
    await recordAuthEvent("LOGIN_SUCCESS", user.email, user.id, getClientIp(req));
    res.redirect(`${env.FRONTEND_ORIGIN}/account`);
  } catch {
    failureRedirect(res);
  }
}
