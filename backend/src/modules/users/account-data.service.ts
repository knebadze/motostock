import { randomBytes } from "node:crypto";
import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import { comparePassword } from "../../lib/password.js";
import { isForeignKeyViolation, isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { deleteUploadedImage } from "../../lib/storage.js";
import { ROLES } from "../../lib/roles.js";
import type { UserConsentMethod } from "../../generated/prisma/index.js";
import { getTerms } from "../terms/terms.service.js";
import { getPrivacyPolicy } from "../privacy-policy/privacy-policy.service.js";
import { usersRepository } from "./users.repository.js";
import { accountDataRepository } from "./account-data.repository.js";
import type { DeleteAccountInput, UpdateProfileInput } from "./users.schema.js";

// The customer's rights under the personal data protection law (2023):
// see and correct their data (profile), get a copy (export), have it erased
// (account deletion) — plus the recorded proof of consent to the terms and
// privacy policy.

// An order still in progress blocks deletion — it has to be delivered or
// cancelled first.
const FINAL_ORDER_STATUS_KEYS = ["DELIVERED", "CANCELLED"];

type RequestMeta = { ipAddress: string | null; userAgent: string | null };

// Records acceptance of BOTH documents (they're accepted together
// everywhere), stamped with each one's current version. Never throws — a
// failure here must not fail the registration/login it accompanies.
export async function recordConsents(userId: number, method: UserConsentMethod, meta: RequestMeta) {
  try {
    const [terms, privacy] = await Promise.all([getTerms(), getPrivacyPolicy()]);
    await accountDataRepository.createConsents(
      (["TERMS", "PRIVACY_POLICY"] as const).map((type) => ({
        userId,
        type,
        method,
        documentVersion: new Date(type === "TERMS" ? terms.updatedAt : privacy.updatedAt),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      })),
    );
  } catch (err) {
    logger.error({ err, userId, method }, "Failed to record consent");
  }
}

function toDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export async function getProfile(userId: number) {
  const user = await accountDataRepository.findProfile(userId);
  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }
  const [terms, privacy] = await Promise.all([getTerms(), getPrivacyPolicy()]);
  const latestAccepted = (type: "TERMS" | "PRIVACY_POLICY") =>
    user.consents.find((consent) => consent.type === type) ?? null;
  const lastTerms = latestAccepted("TERMS");
  const lastPrivacy = latestAccepted("PRIVACY_POLICY");
  // Re-acceptance is asked for when nothing is on record, or a document was
  // edited after the last acceptance.
  const isCurrent = (accepted: typeof lastTerms, documentUpdatedAt: Date | string) =>
    accepted != null &&
    (accepted.documentVersion == null || accepted.documentVersion.getTime() >= new Date(documentUpdatedAt).getTime());

  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    dateOfBirth: toDateOnly(user.dateOfBirth),
    hasPassword: user.passwordHash != null,
    hasGoogle: user.googleId != null,
    hasFacebook: user.facebookId != null,
    createdAt: user.createdAt,
    consent: {
      termsAcceptedAt: lastTerms?.createdAt ?? null,
      privacyAcceptedAt: lastPrivacy?.createdAt ?? null,
      upToDate: isCurrent(lastTerms, terms.updatedAt) && isCurrent(lastPrivacy, privacy.updatedAt),
    },
    // Staff accounts are managed by the admin, not deleted from the shop.
    canDelete: user.role.name === ROLES.USER,
  };
}

export async function updateProfile(userId: number, input: UpdateProfileInput) {
  // A field left out of the request keeps its value; "" clears it.
  const phone = input.phone === undefined ? undefined : input.phone.trim() || null;
  if (phone) {
    const owner = await usersRepository.findByPhone(phone);
    if (owner && owner.id !== userId) {
      // A walk-in from the workshop with this phone: flag it for staff to
      // merge (same as registration does), but don't take the number over
      // — nothing proves it's this customer's. An existing claim is never
      // overwritten (someone guessing a walk-in's number mustn't be able to
      // redirect staff's "confirm merge" to their own account).
      if (owner.isWalkIn && owner.mergedIntoUserId == null && owner.phoneClaimedByUserId == null) {
        await usersRepository.setPhoneClaim(owner.id, userId);
      }
      throw new ApiError(409, "Phone number already in use", "PHONE_ALREADY_IN_USE");
    }
  }

  try {
    await accountDataRepository.updateProfile(userId, {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      ...(phone !== undefined ? { phone } : {}),
      ...(input.dateOfBirth !== undefined
        ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }
        : {}),
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err, "phone")) {
      throw new ApiError(409, "Phone number already in use", "PHONE_ALREADY_IN_USE");
    }
    throw err;
  }
  return getProfile(userId);
}

export async function acceptCurrentConsents(userId: number, meta: RequestMeta) {
  await recordConsents(userId, "ACCOUNT_PAGE", meta);
  return getProfile(userId);
}

export async function exportAccountData(userId: number) {
  const user = await accountDataRepository.findProfile(userId);
  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }
  const data = await accountDataRepository.collectExport(userId, user.email);
  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      dateOfBirth: toDateOnly(user.dateOfBirth),
      createdAt: user.createdAt,
      loginMethods: {
        password: user.passwordHash != null,
        google: user.googleId != null,
        facebook: user.facebookId != null,
      },
    },
    ...data,
  };
}

export async function deleteAccount(userId: number, input: DeleteAccountInput) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }
  if (user.role.name !== ROLES.USER) {
    throw new ApiError(403, "Staff accounts can't be deleted here", "STAFF_ACCOUNT_DELETE_FORBIDDEN");
  }

  // Confirmation: the password, or — for a Google/Facebook-only account —
  // the account's own email typed back.
  if (user.passwordHash) {
    if (!input.password || !(await comparePassword(input.password, user.passwordHash))) {
      throw new ApiError(400, "Incorrect password", "ACCOUNT_DELETE_WRONG_PASSWORD");
    }
  } else if (input.confirmEmail?.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new ApiError(400, "Email doesn't match", "ACCOUNT_DELETE_EMAIL_MISMATCH");
  }

  const erase = () =>
    accountDataRepository.eraseAccount({
      userId,
      email: user.email,
      phone: user.phone,
      finalOrderStatusKeys: FINAL_ORDER_STATUS_KEYS,
      placeholderEmail: `deleted-${userId}-${randomBytes(6).toString("hex")}@deleted.invalid`,
      placeholderName: { first: "წაშლილი", last: "მომხმარებელი" },
    });

  let result: Awaited<ReturnType<typeof erase>>;
  try {
    result = await erase();
  } catch (err) {
    // An order committed between the transaction's count and its hard
    // delete (Restrict FK) — run again; it now takes the anonymize path.
    if (!isForeignKeyViolation(err)) throw err;
    result = await erase();
  }

  // Garage photos — after commit, best-effort (a leftover file is harmless,
  // a deleted file for a rolled-back account wouldn't be).
  await Promise.all(result.imageUrls.map((url) => deleteUploadedImage(url)));

  logger.info({ userId, anonymized: result.anonymized }, "Account deleted by its owner");
  return { anonymized: result.anonymized };
}
