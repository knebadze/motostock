import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../config/prisma.js";
import {
  getFraudFailedLoginThreshold,
  getFraudFailedLoginWindowMinutes,
  getFraudHighValueThreshold,
  getFraudNewAccountWindowHours,
  getFraudVelocityOrderCount,
  getFraudVelocityWindowMinutes,
} from "../settings/settings.service.js";
import { fraudRepository } from "./fraud.repository.js";
import type { AuthEventType, OrderRiskFlagType } from "../../generated/prisma/index.js";

// Never throws — a failure to log an auth event must never block
// login/registration itself. Called from auth.service.ts (password flows)
// and oauth.controller.ts (both providers), success and failure alike.
export async function recordAuthEvent(
  type: AuthEventType,
  email: string,
  userId: number | null,
  ipAddress: string | null,
): Promise<void> {
  try {
    await fraudRepository.createAuthEvent({ type, email, userId, ipAddress });
  } catch (err) {
    logger.error({ err, type, email }, "Failed to record auth event");
  }
}

// Arbitrary, unique to this lock's purpose — same technique as
// orders.repository.ts's PROMO_CODE_LOCK_NAMESPACE and fina-sync.service.ts's
// FINA_SYNC_LOCK_KEY.
const ACCOUNT_LOCKOUT_LOCK_NAMESPACE = 738291645;

// Account-level brute-force lockout — unlike authRateLimit
// (rateLimit.middleware.ts, scoped per-IP), this blocks based on the target
// email itself, so a password-guessing attack spread across many IPs
// against one account is still stopped once it crosses the threshold.
// Reuses the exact same threshold/window Settings already exposes for the
// admin "suspicious login activity" monitoring view below
// (listSuspiciousLoginActivity) — an account that would surface there is
// exactly the one this now actively blocks, rather than just flags for an
// admin to notice after the fact.
//
// The naive version of this (count recent failures, then separately record
// a new one on the *next* failed attempt) is a classic TOCTOU race: a burst
// of concurrent login attempts for the same email all read the same
// pre-burst count before any of them has committed its own failure, so all
// of them pass the threshold check regardless of how large the burst is —
// the lockout only limits *sequential* attempt rate, not concurrent ones.
// This closes that the same way orders.repository.ts's promo-code
// usage-recheck does: a blocking advisory lock scoped to this one email
// (`hashtext(email)` folds the string into the int4 key advisory locks
// need), held for the whole count-check-then-record critical section, so a
// second concurrent attempt against the *same* email is forced to wait for
// the first to finish and commit before it re-counts. Different emails
// never contend with each other — this doesn't serialize logins globally,
// only repeated attempts against one account.
//
// `attempt` does the actual credential check (bcrypt compare) — it runs
// while the lock is held, which is intentional: that's exactly the
// operation whose outcome needs to be recorded before the lock releases.
// Bcrypt (~100-300ms) comfortably fits Prisma's default interactive-
// transaction timeout, and this only serializes repeat attempts on one
// account, never blocks unrelated logins.
export async function runWithAccountLockoutGuard<T>(
  email: string,
  ipAddress: string | null,
  attempt: () => Promise<{ ok: true; result: T } | { ok: false; userId: number | null }>,
): Promise<T> {
  const [threshold, windowMinutes] = await Promise.all([
    getFraudFailedLoginThreshold(),
    getFraudFailedLoginWindowMinutes(),
  ]);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ACCOUNT_LOCKOUT_LOCK_NAMESPACE}, hashtext(${email}))`;

    const recentFailures = await tx.authEvent.count({
      where: { type: "LOGIN_FAILURE", email, createdAt: { gte: since } },
    });
    if (recentFailures >= threshold) {
      throw new ApiError(429, "ძალიან ბევრი წარუმატებელი მცდელობა — სცადეთ მოგვიანებით", "ACCOUNT_LOCKED");
    }

    const outcome = await attempt();
    if (!outcome.ok) {
      await tx.authEvent.create({
        data: { type: "LOGIN_FAILURE", email, userId: outcome.userId, ipAddress },
      });
      throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    return outcome.result;
  });
}

type RiskFlag = { type: OrderRiskFlagType; detail: string | null };

// Best-effort, flag-only — an order auto-confirms whenever FINA itself
// confirmed stock for it (see orders.service.ts's resolveInitialOrderStatusId),
// regardless of what this finds; these flags are for admin review, not a
// gate on that. Called from orders.service.ts's placeOrder after the order
// is fully committed; wrapped entirely in its own try/catch so a scoring bug
// can never turn a successful checkout into an error response.
export async function evaluateOrderRisk(
  order: { id: number; userId: number; total: number; promoCodeId: number | null; ipAddress: string | null },
  userCreatedAt: Date,
): Promise<void> {
  try {
    const flags: RiskFlag[] = [];

    const [newAccountWindowHours, highValueThreshold, velocityOrderCount, velocityWindowMinutes] =
      await Promise.all([
        getFraudNewAccountWindowHours(),
        getFraudHighValueThreshold(),
        getFraudVelocityOrderCount(),
        getFraudVelocityWindowMinutes(),
      ]);

    const accountAgeHours = (Date.now() - userCreatedAt.getTime()) / (60 * 60 * 1000);
    if (accountAgeHours < newAccountWindowHours && order.total > highValueThreshold) {
      flags.push({
        type: "NEW_ACCOUNT_HIGH_VALUE",
        detail: `ანგარიში შექმნილია ${Math.round(accountAgeHours)} საათის წინ, შეკვეთის თანხა: ${order.total} ₾`,
      });
    }

    const velocitySince = new Date(Date.now() - velocityWindowMinutes * 60 * 1000);
    const recentOrderCount = await fraudRepository.countOrdersSince(order.userId, velocitySince);
    if (recentOrderCount > velocityOrderCount) {
      flags.push({
        type: "ORDER_VELOCITY",
        detail: `${recentOrderCount} შეკვეთა ბოლო ${velocityWindowMinutes} წუთში`,
      });
    }

    if (order.ipAddress) {
      const otherUserIdsForIp = (await fraudRepository.findUserIdsForIp(order.ipAddress)).filter(
        (id) => id !== order.userId,
      );

      if (otherUserIdsForIp.length > 0) {
        flags.push({
          type: "SHARED_IP_MULTIPLE_ACCOUNTS",
          detail: `IP მისამართი ზიარდება ${otherUserIdsForIp.length} სხვა ანგარიშთან`,
        });

        if (order.promoCodeId != null) {
          const otherPromoUserIds = await fraudRepository.findOtherPromoCodeUsers(
            order.promoCodeId,
            order.userId,
          );
          const overlap = otherPromoUserIds.filter((id) => otherUserIdsForIp.includes(id));
          if (overlap.length > 0) {
            flags.push({
              type: "PROMO_CODE_MULTI_ACCOUNT",
              detail: `იგივე პრომოკოდი გამოყენებულია ${overlap.length} სხვა ანგარიშით, რომელიც იზიარებს ამ IP-ს`,
            });
          }
        }
      }
    }

    if (flags.length > 0) {
      await fraudRepository.createRiskFlags(order.id, flags);
    }
  } catch (err) {
    logger.error({ err, orderId: order.id }, "Order risk evaluation failed");
  }
}

// Computed live, not stored — see fraud.repository.ts's groupBy queries.
// Login abuse is a moving-window monitoring concern (an admin checking "is
// anything suspicious happening right now"), not a persisted historical
// record the way order risk flags are.
export async function listSuspiciousLoginActivity() {
  const [threshold, windowMinutes] = await Promise.all([
    getFraudFailedLoginThreshold(),
    getFraudFailedLoginWindowMinutes(),
  ]);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const [byEmail, byIp] = await Promise.all([
    fraudRepository.countFailedLoginsByEmail(since),
    fraudRepository.countFailedLoginsByIp(since),
  ]);

  return {
    windowMinutes,
    threshold,
    byEmail: byEmail.filter((row) => row.count >= threshold),
    byIp: byIp.filter((row) => row.count >= threshold),
  };
}
