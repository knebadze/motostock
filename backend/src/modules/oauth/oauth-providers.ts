import { env } from "../../config/env.js";

export class OAuthError extends Error {}

export type OAuthProfile = { providerId: string; email: string; name: string };

function redirectUri(provider: "google" | "facebook"): string {
  return `${env.BACKEND_PUBLIC_URL}/api/auth/${provider}/callback`;
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.BACKEND_PUBLIC_URL);
}

export function isFacebookConfigured(): boolean {
  return Boolean(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET && env.BACKEND_PUBLIC_URL);
}

export function getGoogleAuthUrl(state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri("google"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return url.toString();
}

export function getFacebookAuthUrl(state: string): string {
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", env.FACEBOOK_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri("facebook"));
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri("google"),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw new OAuthError(`Google token exchange failed (${tokenRes.status})`);
  }
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    throw new OAuthError(`Google profile fetch failed (${profileRes.status})`);
  }
  const profile = (await profileRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!profile.email || !profile.email_verified) {
    throw new OAuthError("Google account has no verified email");
  }

  return { providerId: profile.sub, email: profile.email, name: profile.name ?? profile.email };
}

export async function exchangeFacebookCode(code: string): Promise<OAuthProfile> {
  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", env.FACEBOOK_CLIENT_ID!);
  tokenUrl.searchParams.set("client_secret", env.FACEBOOK_CLIENT_SECRET!);
  tokenUrl.searchParams.set("redirect_uri", redirectUri("facebook"));
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) {
    throw new OAuthError(`Facebook token exchange failed (${tokenRes.status})`);
  }
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string };

  const profileUrl = new URL("https://graph.facebook.com/me");
  profileUrl.searchParams.set("fields", "id,name,email");
  profileUrl.searchParams.set("access_token", accessToken);

  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) {
    throw new OAuthError(`Facebook profile fetch failed (${profileRes.status})`);
  }
  const profile = (await profileRes.json()) as { id: string; email?: string; name?: string };

  if (!profile.email) {
    throw new OAuthError("Facebook account has no email permission granted");
  }

  return { providerId: profile.id, email: profile.email, name: profile.name ?? profile.email };
}
