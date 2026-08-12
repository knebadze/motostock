import { beforeEach, describe, expect, it, vi } from "vitest";
import { fraudRepository } from "./fraud.repository.js";
import {
  getFraudHighValueThreshold,
  getFraudNewAccountWindowHours,
  getFraudVelocityOrderCount,
  getFraudVelocityWindowMinutes,
} from "../settings/settings.service.js";
import { evaluateOrderRisk } from "./fraud.service.js";

vi.mock("./fraud.repository.js", () => ({
  fraudRepository: {
    createAuthEvent: vi.fn(),
    countOrdersSince: vi.fn(),
    findUserIdsForIp: vi.fn(),
    findOtherPromoCodeUsers: vi.fn(),
    createRiskFlags: vi.fn(),
    countFailedLoginsByEmail: vi.fn(),
    countFailedLoginsByIp: vi.fn(),
  },
}));

vi.mock("../settings/settings.service.js", () => ({
  getFraudNewAccountWindowHours: vi.fn(),
  getFraudHighValueThreshold: vi.fn(),
  getFraudVelocityOrderCount: vi.fn(),
  getFraudVelocityWindowMinutes: vi.fn(),
  getFraudFailedLoginThreshold: vi.fn(),
  getFraudFailedLoginWindowMinutes: vi.fn(),
}));

const HOUR_MS = 60 * 60 * 1000;

function baseOrder(overrides: Partial<Parameters<typeof evaluateOrderRisk>[0]> = {}) {
  return {
    id: 1,
    userId: 10,
    total: 100,
    promoCodeId: null,
    ipAddress: null,
    ...overrides,
  };
}

describe("evaluateOrderRisk", () => {
  beforeEach(() => {
    // Clears call history left over from the previous test — without this,
    // assertions like "not.toHaveBeenCalled()" see calls from earlier tests
    // that share this same mocked module instance.
    vi.clearAllMocks();

    // Thresholds set high/inert by default — each test opts into the one
    // condition it's actually exercising, everything else stays quiet.
    vi.mocked(getFraudNewAccountWindowHours).mockResolvedValue(24);
    vi.mocked(getFraudHighValueThreshold).mockResolvedValue(1000);
    vi.mocked(getFraudVelocityOrderCount).mockResolvedValue(3);
    vi.mocked(getFraudVelocityWindowMinutes).mockResolvedValue(30);
    vi.mocked(fraudRepository.countOrdersSince).mockResolvedValue(0);
    vi.mocked(fraudRepository.findUserIdsForIp).mockResolvedValue([]);
    vi.mocked(fraudRepository.findOtherPromoCodeUsers).mockResolvedValue([]);
    vi.mocked(fraudRepository.createRiskFlags).mockResolvedValue(undefined as never);
  });

  it("flags a high-value order from a brand-new account", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * HOUR_MS);
    await evaluateOrderRisk(baseOrder({ total: 5000 }), twoHoursAgo);

    expect(fraudRepository.createRiskFlags).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ type: "NEW_ACCOUNT_HIGH_VALUE" })]),
    );
  });

  it("does not flag a high-value order from an established account", async () => {
    const longAgo = new Date(Date.now() - 365 * 24 * HOUR_MS);
    await evaluateOrderRisk(baseOrder({ total: 5000 }), longAgo);

    expect(fraudRepository.createRiskFlags).not.toHaveBeenCalled();
  });

  it("does not flag a low-value order from a new account", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * HOUR_MS);
    await evaluateOrderRisk(baseOrder({ total: 10 }), twoHoursAgo);

    expect(fraudRepository.createRiskFlags).not.toHaveBeenCalled();
  });

  it("flags order velocity once the recent order count exceeds the threshold", async () => {
    vi.mocked(fraudRepository.countOrdersSince).mockResolvedValue(4);

    await evaluateOrderRisk(baseOrder(), new Date(0));

    expect(fraudRepository.createRiskFlags).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ type: "ORDER_VELOCITY" })]),
    );
  });

  it("does not flag order velocity at exactly the threshold", async () => {
    vi.mocked(fraudRepository.countOrdersSince).mockResolvedValue(3);

    await evaluateOrderRisk(baseOrder(), new Date(0));

    expect(fraudRepository.createRiskFlags).not.toHaveBeenCalled();
  });

  it("flags a shared IP with other accounts", async () => {
    vi.mocked(fraudRepository.findUserIdsForIp).mockResolvedValue([10, 11, 12]);

    await evaluateOrderRisk(baseOrder({ ipAddress: "1.2.3.4" }), new Date(0));

    expect(fraudRepository.createRiskFlags).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ type: "SHARED_IP_MULTIPLE_ACCOUNTS" })]),
    );
  });

  it("excludes the order's own user from the shared-IP check", async () => {
    vi.mocked(fraudRepository.findUserIdsForIp).mockResolvedValue([10]);

    await evaluateOrderRisk(baseOrder({ userId: 10, ipAddress: "1.2.3.4" }), new Date(0));

    expect(fraudRepository.createRiskFlags).not.toHaveBeenCalled();
  });

  it("skips the shared-IP check entirely when no IP was captured", async () => {
    vi.mocked(fraudRepository.findUserIdsForIp).mockResolvedValue([11]);

    await evaluateOrderRisk(baseOrder({ ipAddress: null }), new Date(0));

    expect(fraudRepository.findUserIdsForIp).not.toHaveBeenCalled();
    expect(fraudRepository.createRiskFlags).not.toHaveBeenCalled();
  });

  it("flags promo-code multi-account abuse when a shared-IP user redeemed the same code", async () => {
    vi.mocked(fraudRepository.findUserIdsForIp).mockResolvedValue([11, 12]);
    vi.mocked(fraudRepository.findOtherPromoCodeUsers).mockResolvedValue([12, 13]);

    await evaluateOrderRisk(
      baseOrder({ ipAddress: "1.2.3.4", promoCodeId: 5 }),
      new Date(0),
    );

    expect(fraudRepository.createRiskFlags).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ type: "SHARED_IP_MULTIPLE_ACCOUNTS" }),
        expect.objectContaining({ type: "PROMO_CODE_MULTI_ACCOUNT" }),
      ]),
    );
  });

  it("does not flag promo-code abuse when the promo's other users don't share the IP", async () => {
    vi.mocked(fraudRepository.findUserIdsForIp).mockResolvedValue([11]);
    vi.mocked(fraudRepository.findOtherPromoCodeUsers).mockResolvedValue([99]);

    await evaluateOrderRisk(
      baseOrder({ ipAddress: "1.2.3.4", promoCodeId: 5 }),
      new Date(0),
    );

    const calls = vi.mocked(fraudRepository.createRiskFlags).mock.calls;
    const types = calls.flatMap(([, flags]) => flags.map((flag) => flag.type));
    expect(types).not.toContain("PROMO_CODE_MULTI_ACCOUNT");
  });

  it("never checks promo-code abuse without a promo code on the order", async () => {
    vi.mocked(fraudRepository.findUserIdsForIp).mockResolvedValue([11]);

    await evaluateOrderRisk(baseOrder({ ipAddress: "1.2.3.4", promoCodeId: null }), new Date(0));

    expect(fraudRepository.findOtherPromoCodeUsers).not.toHaveBeenCalled();
  });

  it("writes no flags at all when nothing looks suspicious", async () => {
    await evaluateOrderRisk(baseOrder(), new Date(0));

    expect(fraudRepository.createRiskFlags).not.toHaveBeenCalled();
  });

  it("never throws, even if a dependency fails mid-evaluation", async () => {
    vi.mocked(fraudRepository.countOrdersSince).mockRejectedValue(new Error("db down"));

    await expect(evaluateOrderRisk(baseOrder(), new Date(0))).resolves.toBeUndefined();
    expect(fraudRepository.createRiskFlags).not.toHaveBeenCalled();
  });
});
