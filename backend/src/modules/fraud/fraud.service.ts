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

// Account-level brute-force lockout — unlike authRateLimit
// (rateLimit.middleware.ts, scoped per-IP), this is keyed on the target
// email itself, so a password-guessing attack spread across many IPs
// against one account is still counted. Reuses the threshold/window
// Settings of the admin "suspicious login activity" view below
// (listSuspiciousLoginActivity).
//
// Concurrency: at most ONE attempt per email is in flight at a time (in
// this process) — a concurrent second one is refused immediately with a
// "try again" (429) instead of being evaluated, so a burst against one
// account can't parallelize its guesses, and the failure count it reads
// can't be stale. This used to be a Postgres advisory lock held in an
// interactive transaction AROUND the bcrypt compare: every login then held
// two pooled connections (the transaction's, plus the user lookup's) for
// bcrypt's ~100-300 ms of CPU, so ~15 concurrent logins could exhaust the
// pool (30) and stall the whole site. Now bcrypt runs with no connection
// held, and recording a failure is a single insert. (Per process: fine for
// this single-instance deployment; with several backend instances, each
// would serialize its own share.)
//
// A correct password always succeeds, even while "locked" — otherwise
// anyone knowing the email could keep the real owner locked out forever by
// sending wrong guesses. The lockout only changes how a WRONG guess is
// answered (429 "too many attempts" instead of 401).
const loginAttemptsInFlight = new Set<string>();

export async function runWithAccountLockoutGuard<T>(
  email: string,
  ipAddress: string | null,
  attempt: () => Promise<{ ok: true; result: T } | { ok: false; userId: number | null }>,
): Promise<T> {
  const key = email.toLowerCase();
  if (loginAttemptsInFlight.has(key)) {
    throw new ApiError(
      429,
      "ამ ანგარიშზე უკვე მიმდინარეობს შესვლის მცდელობა — სცადეთ ცოტა ხანში",
      "LOGIN_ATTEMPT_IN_PROGRESS",
    );
  }
  loginAttemptsInFlight.add(key);
  try {
    const result = await attempt();
    if (result.ok) {
      return result.result;
    }

    const [threshold, windowMinutes] = await Promise.all([
      getFraudFailedLoginThreshold(),
      getFraudFailedLoginWindowMinutes(),
    ]);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentFailures = await prisma.authEvent.count({
      where: { type: "LOGIN_FAILURE", email, createdAt: { gte: since } },
    });
    await prisma.authEvent.create({
      data: { type: "LOGIN_FAILURE", email, userId: result.userId, ipAddress },
    });

    if (recentFailures >= threshold) {
      throw new ApiError(429, "ძალიან ბევრი წარუმატებელი მცდელობა — სცადეთ მოგვიანებით", "ACCOUNT_LOCKED");
    }
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  } finally {
    loginAttemptsInFlight.delete(key);
  }
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
// Login/registration audit rows (AuthEvent) are read only over short
// windows (lockout: minutes; suspicious-activity view: the configured
// window) — kept half a year for an admin looking back at an incident, then
// pruned daily (scheduled-jobs.registry.ts) instead of growing forever.
const AUTH_EVENT_RETENTION_DAYS = 180;

export async function pruneOldAuthEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - AUTH_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.authEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}

export async function listSuspiciousLoginActivity() {
  const [threshold, windowMinutes] = await Promise.all([
    getFraudFailedLoginThreshold(),
    getFraudFailedLoginWindowMinutes(),
  ]);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const [byEmail, byIp] = await Promise.all([
    fraudRepository.countFailedLoginsByEmail(since, threshold),
    fraudRepository.countFailedLoginsByIp(since, threshold),
  ]);

  return { windowMinutes, threshold, byEmail, byIp };
}
