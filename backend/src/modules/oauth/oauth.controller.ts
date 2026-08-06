import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { setAuthCookie } from "../../lib/jwt.js";
import { mergeGuestWishlistCookie } from "../wishlist/wishlist.middleware.js";
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

  if (!parsed.success || !parsed.data.code || !parsed.data.state || parsed.data.state !== cookieState) {
    failureRedirect(res);
    return;
  }

  try {
    const { user, token } = await loginWithGoogle(parsed.data.code);
    setAuthCookie(res, token);
    await mergeGuestWishlistCookie(req, res, user.id);
    res.redirect(`${env.FRONTEND_ORIGIN}/account`);
  } catch {
    failureRedirect(res);
  }
}

export async function handleFacebookCallback(req: Request, res: Response) {
  const parsed = oauthCallbackQuerySchema.safeParse(req.query);
  const cookieState = req.cookies?.[STATE_COOKIE_NAME];
  res.clearCookie(STATE_COOKIE_NAME);

  if (!parsed.success || !parsed.data.code || !parsed.data.state || parsed.data.state !== cookieState) {
    failureRedirect(res);
    return;
  }

  try {
    const { user, token } = await loginWithFacebook(parsed.data.code);
    setAuthCookie(res, token);
    await mergeGuestWishlistCookie(req, res, user.id);
    res.redirect(`${env.FRONTEND_ORIGIN}/account`);
  } catch {
    failureRedirect(res);
  }
}
