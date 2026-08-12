import { logger } from "../../lib/logger.js";
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

type RiskFlag = { type: OrderRiskFlagType; detail: string | null };

// Best-effort, flag-only — never blocks, reverses, or delays an order.
// Called from orders.service.ts's placeOrder after the order is fully
// committed; wrapped entirely in its own try/catch so a scoring bug can
// never turn a successful checkout into an error response.
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
