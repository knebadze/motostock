import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/ApiError.js";
import { cartRepository } from "../cart/cart.repository.js";
import { syncVariantStockByIds } from "../fina-sync/fina-sync.service.js";
import { isPromoStackingEnabled } from "../settings/settings.service.js";
import { resolvePromoCodeForItems, promoCodeItemKey } from "../promo-codes/promo-codes.service.js";
import { computeCheckoutTotals } from "./orders.service.js";

vi.mock("../cart/cart.repository.js", () => ({
  cartRepository: { findByOwner: vi.fn() },
}));

vi.mock("../fina-sync/fina-sync.service.js", () => ({
  syncVariantStockByIds: vi.fn().mockResolvedValue(false),
}));

// computeCheckoutTotals only ever calls isPromoStackingEnabled — the other
// delivery-pricing getters live in this same module (used by
// resolveDelivery, not under test here) but still need a stand-in so
// orders.service.ts's top-level import of them doesn't resolve to
// `undefined` bindings that error if some other code path touched them.
vi.mock("../settings/settings.service.js", () => ({
  isPromoStackingEnabled: vi.fn(),
  getDeliveryTbilisiPrice: vi.fn(),
  getDeliveryTbilisiTime: vi.fn(),
  getDeliveryRegionsPrice: vi.fn(),
  getDeliveryRegionsTime: vi.fn(),
  getDeliveryExpressPrice: vi.fn(),
  getDeliveryExpressTime: vi.fn(),
}));

// Keeps the real promoCodeItemKey (a pure function computeCheckoutTotals
// relies on to match promo results back to cart rows) while letting each
// test control what resolvePromoCodeForItems itself resolves/throws.
vi.mock("../promo-codes/promo-codes.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../promo-codes/promo-codes.service.js")>();
  return { ...actual, resolvePromoCodeForItems: vi.fn() };
});

type CartRow = Awaited<ReturnType<typeof cartRepository.findByOwner>>[number];

function productVariantCartRow(params: {
  id?: number;
  price: number;
  quantity: number;
  stockQuantity?: number;
  discounts?: { startDate: Date; endDate: Date; discountPrice: number }[];
}): CartRow {
  const id = params.id ?? 1;
  return {
    itemType: "PRODUCT_VARIANT",
    quantity: params.quantity,
    productVariant: {
      id,
      price: params.price,
      stockQuantity: params.stockQuantity ?? 100,
      discounts: params.discounts ?? [],
      size: null,
      color: null,
      images: [],
      product: { nameKa: "პროდუქტი", nameEn: "Product", nameRu: "Продукт", imageUrl: null },
    },
    vehicleListing: null,
  } as unknown as CartRow;
}

function vehicleListingCartRow(params: {
  id?: number;
  price: number;
  quantity: number;
  stockQuantity?: number;
  discounts?: { startDate: Date; endDate: Date; discountPrice: number }[];
}): CartRow {
  const id = params.id ?? 1;
  return {
    itemType: "VEHICLE_LISTING",
    quantity: params.quantity,
    productVariant: null,
    vehicleListing: {
      id,
      price: params.price,
      stockQuantity: params.stockQuantity ?? 100,
      discounts: params.discounts ?? [],
      images: [],
      vehicleCatalog: {
        imageUrl: null,
        brand: { nameKa: "მარკა", nameEn: "Brand", nameRu: "Марка" },
        model: { nameKa: "მოდელი", nameEn: "Model", nameRu: "Модель" },
      },
    },
  } as unknown as CartRow;
}

const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000);
const TOMORROW = new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("computeCheckoutTotals", () => {
  beforeEach(() => {
    vi.mocked(isPromoStackingEnabled).mockResolvedValue(false);
    vi.mocked(resolvePromoCodeForItems).mockReset();
    vi.mocked(syncVariantStockByIds).mockResolvedValue(false);
  });

  it("rejects an empty cart", async () => {
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([]);

    await expect(computeCheckoutTotals(1)).rejects.toMatchObject({
      message: "კალათა ცარიელია",
      statusCode: 400,
    } satisfies Partial<ApiError>);
  });

  it("charges the base price with no promo and no active discount", async () => {
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([
      productVariantCartRow({ price: 100, quantity: 2 }),
    ]);

    const result = await computeCheckoutTotals(1);

    expect(result.subtotal).toBe(200);
    expect(result.total).toBe(200);
    expect(result.discountTotal).toBe(0);
    expect(result.items[0].unitPrice).toBe(100);
    expect(result.items[0].lineTotal).toBe(200);
  });

  it("applies an active per-item discount when there's no promo code", async () => {
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([
      productVariantCartRow({
        price: 100,
        quantity: 1,
        discounts: [{ startDate: YESTERDAY, endDate: TOMORROW, discountPrice: 80 }],
      }),
    ]);

    const result = await computeCheckoutTotals(1);

    expect(result.subtotal).toBe(100);
    expect(result.total).toBe(80);
    expect(result.discountTotal).toBe(20);
  });

  it("ignores an expired or not-yet-started discount", async () => {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([
      productVariantCartRow({
        price: 100,
        quantity: 1,
        discounts: [{ startDate: lastWeek, endDate: yesterday, discountPrice: 50 }],
      }),
    ]);

    const result = await computeCheckoutTotals(1);

    expect(result.total).toBe(100);
    expect(result.discountTotal).toBe(0);
  });

  it("applies a matching promo code as a flat percentage off the base price", async () => {
    const row = productVariantCartRow({ id: 42, price: 100, quantity: 1 });
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([row]);
    vi.mocked(resolvePromoCodeForItems).mockResolvedValue({
      id: 1,
      code: "SAVE10",
      discountPercent: 10,
      matchedKeys: new Set([promoCodeItemKey({ itemType: "PRODUCT_VARIANT", productVariantId: 42 })]),
    });

    const result = await computeCheckoutTotals(1, "SAVE10");

    expect(result.subtotal).toBe(100);
    expect(result.total).toBe(90);
    expect(result.discountTotal).toBe(10);
    expect(result.promoCode).toEqual({ id: 1, code: "SAVE10", discountPercent: 10 });
  });

  it("only discounts the cart items the promo code actually matched", async () => {
    const matched = productVariantCartRow({ id: 1, price: 100, quantity: 1 });
    const unmatched = productVariantCartRow({ id: 2, price: 50, quantity: 1 });
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([matched, unmatched]);
    vi.mocked(resolvePromoCodeForItems).mockResolvedValue({
      id: 1,
      code: "SAVE10",
      discountPercent: 10,
      matchedKeys: new Set([promoCodeItemKey({ itemType: "PRODUCT_VARIANT", productVariantId: 1 })]),
    });

    const result = await computeCheckoutTotals(1, "SAVE10");

    const matchedItem = result.items.find((item) => item.productVariantId === 1);
    const unmatchedItem = result.items.find((item) => item.productVariantId === 2);
    expect(matchedItem?.unitPrice).toBe(90);
    expect(unmatchedItem?.unitPrice).toBe(50);
  });

  it("lets an active per-item discount override the promo when stacking is disabled", async () => {
    vi.mocked(isPromoStackingEnabled).mockResolvedValue(false);
    const row = productVariantCartRow({
      id: 1,
      price: 100,
      quantity: 1,
      discounts: [{ startDate: YESTERDAY, endDate: TOMORROW, discountPrice: 70 }],
    });
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([row]);
    vi.mocked(resolvePromoCodeForItems).mockResolvedValue({
      id: 1,
      code: "HALF",
      discountPercent: 50,
      matchedKeys: new Set([promoCodeItemKey({ itemType: "PRODUCT_VARIANT", productVariantId: 1 })]),
    });

    const result = await computeCheckoutTotals(1, "HALF");

    // The 30%-off item discount wins outright — the promo is not applied on
    // top of it while stacking is disabled.
    expect(result.total).toBe(70);
    expect(result.discountTotal).toBe(30);
  });

  it("stacks the promo on top of an active per-item discount when stacking is enabled", async () => {
    vi.mocked(isPromoStackingEnabled).mockResolvedValue(true);
    const row = productVariantCartRow({
      id: 1,
      price: 100,
      quantity: 1,
      discounts: [{ startDate: YESTERDAY, endDate: TOMORROW, discountPrice: 70 }],
    });
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([row]);
    vi.mocked(resolvePromoCodeForItems).mockResolvedValue({
      id: 1,
      code: "HALF",
      discountPercent: 50,
      matchedKeys: new Set([promoCodeItemKey({ itemType: "PRODUCT_VARIANT", productVariantId: 1 })]),
    });

    const result = await computeCheckoutTotals(1, "HALF");

    // 100 -> 70 (item discount) -> 35 (further 50% off, since stacking is on).
    expect(result.total).toBe(35);
    expect(result.discountTotal).toBe(65);
  });

  it("sums subtotal and total correctly across mixed product and vehicle items", async () => {
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([
      productVariantCartRow({ id: 1, price: 100, quantity: 1 }),
      vehicleListingCartRow({ id: 1, price: 5000, quantity: 1 }),
    ]);

    const result = await computeCheckoutTotals(1);

    expect(result.subtotal).toBe(5100);
    expect(result.total).toBe(5100);
    expect(result.items).toHaveLength(2);
  });

  it("surfaces finaConfirmed=true when FINA confirmed stock for this cart", async () => {
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([
      productVariantCartRow({ id: 1, price: 100, quantity: 1 }),
    ]);
    vi.mocked(syncVariantStockByIds).mockResolvedValue(true);

    const result = await computeCheckoutTotals(1);

    expect(result.finaConfirmed).toBe(true);
  });

  it("surfaces finaConfirmed=false when FINA wasn't reached (not configured, failed, or nothing FINA-linked)", async () => {
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([
      productVariantCartRow({ id: 1, price: 100, quantity: 1 }),
    ]);
    vi.mocked(syncVariantStockByIds).mockResolvedValue(false);

    const result = await computeCheckoutTotals(1);

    expect(result.finaConfirmed).toBe(false);
  });

  it("never calls FINA (and finaConfirmed stays false) for a cart with only vehicle-listing items", async () => {
    vi.mocked(cartRepository.findByOwner).mockResolvedValue([
      vehicleListingCartRow({ id: 1, price: 5000, quantity: 1 }),
    ]);

    const result = await computeCheckoutTotals(1);

    // No productVariantIds to sync — computeCheckoutTotals still calls
    // syncVariantStockByIds([]), which fina-sync.service.ts's own guard
    // resolves to false without making any real FINA call.
    expect(vi.mocked(syncVariantStockByIds)).toHaveBeenCalledWith([]);
    expect(result.finaConfirmed).toBe(false);
  });
});
