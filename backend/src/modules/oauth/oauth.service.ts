import { signJwt } from "../../lib/jwt.js";
import { ApiError } from "../../lib/ApiError.js";
import { ROLES, type RoleName } from "../../lib/roles.js";
import { usersRepository } from "../users/users.repository.js";
import { rolesRepository } from "../roles/roles.repository.js";
import { toSafeUser } from "../auth/auth.service.js";
import {
  exchangeFacebookCode,
  exchangeGoogleCode,
  type OAuthProfile,
} from "./oauth-providers.js";

type Provider = "google" | "facebook";

// OAuth providers here only expose a single display name (no separate
// given_name/family_name capture) — split on the first space, falling back
// to using the whole name as both parts for single-word names.
function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: trimmed };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim() || trimmed.slice(0, spaceIndex),
  };
}

async function findOrCreateOAuthUser(profile: OAuthProfile, provider: Provider) {
  const existingByProvider =
    provider === "google"
      ? await usersRepository.findByGoogleId(profile.providerId)
      : await usersRepository.findByFacebookId(profile.providerId);
  if (existingByProvider) return existingByProvider;

  const existingByEmail = await usersRepository.findByEmail(profile.email);
  if (existingByEmail) {
    return provider === "google"
      ? usersRepository.linkGoogleId(existingByEmail.id, profile.providerId)
      : usersRepository.linkFacebookId(existingByEmail.id, profile.providerId);
  }

  const userRole = await rolesRepository.findByName(ROLES.USER);
  if (!userRole) {
    throw new ApiError(500, "Default role is not configured");
  }

  return usersRepository.createOAuthUser({
    email: profile.email,
    ...splitName(profile.name),
    roleId: userRole.id,
    ...(provider === "google"
      ? { googleId: profile.providerId }
      : { facebookId: profile.providerId }),
  });
}

async function completeOAuthLogin(profile: OAuthProfile, provider: Provider) {
  const user = await findOrCreateOAuthUser(profile, provider);
  const token = signJwt({ sub: user.id, role: user.role.name as RoleName, loginAt: Date.now() });
  return { user: toSafeUser(user), token };
}

export async function loginWithGoogle(code: string) {
  const profile = await exchangeGoogleCode(code);
  return completeOAuthLogin(profile, "google");
}

export async function loginWithFacebook(code: string) {
  const profile = await exchangeFacebookCode(code);
  return completeOAuthLogin(profile, "facebook");
}
