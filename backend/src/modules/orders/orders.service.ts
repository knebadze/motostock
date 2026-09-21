import { randomInt } from "node:crypto";
import { ApiError } from "../../lib/ApiError.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { Prisma, type OrderDeliverySpeed, type OrderFulfillmentMethod } from "../../generated/prisma/index.js";
import { cartRepository } from "../cart/cart.repository.js";
import { addressesRepository } from "../addresses/addresses.repository.js";
import { banksRepository } from "../banks/banks.repository.js";
import { usersRepository } from "../users/users.repository.js";
import { syncVariantStockByIds, pushOrderSale } from "../fina-sync/fina-sync.service.js";
import { sendEmailTemplate } from "../email-templates/email-templates.service.js";
import { evaluateOrderRisk } from "../fraud/fraud.service.js";
import { resolvePromoCodeForItems, promoCodeItemKey } from "../promo-codes/promo-codes.service.js";
import {
  isPromoStackingEnabled,
  getDeliveryTbilisiPrice,
  getDeliveryTbilisiTime,
  getDeliveryRegionsPrice,
  getDeliveryRegionsTime,
  getDeliveryExpressPrice,
  getDeliveryExpressTime,
  getAdminNotificationEmail,
} from "../settings/settings.service.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { orderStatusesRepository } from "../order-statuses/order-statuses.repository.js";
import { ordersRepository, type PlaceOrderItemInput } from "./orders.repository.js";
import type { CheckoutInput } from "./orders.schema.js";

// Checkout pricing + order placement, plus the mapper/status-resolution
// helpers shared with the rest of the module. Split from a single 1100+
// line file: see orders-query.service.ts for customer/admin order reads
// (list/get/reorder) and orders-admin.service.ts for status transitions +
// FINA-retry — both import the shared helpers (toOrderResponse,
// computeEstimatedDeliveryDate, resolveSoldStatusId/resolveAvailableStatusId/
// resolveInitialOrderStatusId) from this file.

// Excludes visually ambiguous characters (0/O, 1/I/L) so a customer reading
// the code aloud or typing it back in doesn't stumble.
const ORDER_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ORDER_CODE_LENGTH = 8;
const MAX_ORDER_CODE_ATTEMPTS = 5;

function generateOrderCode(): string {
  let code = "";
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    code += ORDER_CODE_CHARSET[randomInt(ORDER_CODE_CHARSET.length)];
  }
  return code;
}

// order-statuses (see order-statuses.repository.ts) replaced the old
// hardcoded OrderStatus enum — every new order needs a starting status
// resolved by its stable `key` rather than relying on a fragile "row id 1"
// assumption. Throws loudly if the lookup wasn't seeded (see
// prisma/seed.ts's ORDER_STATUSES) instead of silently failing later.
//
// Which key gets resolved depends on whether FINA actually confirmed stock
// for this order's items during computeCheckoutTotals's live refresh (see
// CheckoutBreakdown.finaConfirmed): confirmed orders skip straight to
// CONFIRMED, everything else (FINA not configured, no FINA-linked items in
// the cart, or the FINA call itself failed) lands on PENDING exactly like
// before, for an admin to confirm by hand once they've checked stock.
export async function resolveInitialOrderStatusId(finaConfirmed: boolean): Promise<number> {
  const key = finaConfirmed ? "CONFIRMED" : "PENDING";
  const status = await orderStatusesRepository.findByKey(key);
  if (!status) {
    throw new ApiError(
      500,
      `შეკვეთის საწყისი სტატუსი ("${key}") ვერ მოიძებნა — გაუშვით prisma/seed.ts`,
      "INTERNAL_CONFIG_ERROR",
    );
  }
  return status.id;
}

// Same "resolve by stable key" pattern as resolvePendingStatusId above —
// applied to whichever ProductVariant/VehicleListing rows placeOrder's
// stock decrement drives to zero (see ordersRepository.placeOrder).
export async function resolveSoldStatusId(): Promise<number> {
  const status = await lookupsRepository.findByKey(getLookupDelegate("listing-statuses"), "SOLD");
  if (!status) {
    throw new ApiError(500, "„გაყიდულია“ სტატუსი ვერ მოიძებნა — გაუშვით prisma/seed.ts", "INTERNAL_CONFIG_ERROR");
  }
  return status.id;
}

// Same pattern, used by orders-admin.service.ts's updateOrderStatus to flip
// a variant/listing back off SOLD when a cancellation restores the stock
// that drove it there.
export async function resolveAvailableStatusId(): Promise<number> {
  const status = await lookupsRepository.findByKey(getLookupDelegate("listing-statuses"), "AVAILABLE");
  if (!status) {
    throw new ApiError(500, "„ხელმისაწვდომია“ სტატუსი ვერ მოიძებნა — გაუშვით prisma/seed.ts", "INTERNAL_CONFIG_ERROR");
  }
  return status.id;
}

function isOrderCodeCollision(error: unknown): boolean {
  return isUniqueConstraintViolation(error, "orderCode");
}

// Two truly concurrent requests carrying the same idempotencyKey can both
// pass placeOrder's early findByIdempotencyKey check (below) before either
// has committed — this catches the DB-level unique-constraint collision that
// results, the same safety-net role isOrderCodeCollision plays for orderCode.
function isIdempotencyKeyCollision(error: unknown): boolean {
  return isUniqueConstraintViolation(error, "idempotencyKey");
}

type CartRow = Awaited<ReturnType<typeof cartRepository.findByOwner>>[number];

type BreakdownItem = PlaceOrderItemInput & { stockQuantity: number };

type CheckoutBreakdown = {
  items: BreakdownItem[];
  // Same order/index correspondence as `items` — the exact CartItem ids this
  // breakdown was built from, kept separate from BreakdownItem/
  // PlaceOrderItemInput (rather than added as a field on each item) so it
  // can never accidentally leak into previewCheckout's public response
  // shape (toBreakdownResponse below builds that explicitly) or into the
  // OrderItem rows placeOrder persists (which spread PlaceOrderItemInput
  // directly). Consumed only by placeOrder, to scope its post-order
  // cart-clear to exactly what was ordered instead of the customer's whole
  // cart — see orders.repository.ts's placeOrder.
  cartItemIds: number[];
  subtotal: number;
  discountTotal: number;
  total: number;
  promoCode: { id: number; code: string; discountPercent: number } | null;
  // True when every cart item already has an active
  // ProductVariantDiscount/VehicleListingDiscount and promo-stacking is off
  // — in that state, no promo code (whichever one the customer might type)
  // could change any item's price, so the checkout UI disables the promo
  // input outright instead of letting the customer "spend" a one-time code
  // for zero benefit. See computeCheckoutTotals's promoCodeBlocked and the
  // PROMO_CODE_NO_EFFECT guard below for the enforcement side of this.
  promoCodeBlocked: boolean;
  // Whether FINA was actually reached and confirmed stock for this cart's
  // FINA-linked items during the live refresh below — see placeOrder's use
  // of this to pick the order's initial status (resolveInitialOrderStatusId).
  finaConfirmed: boolean;
};

function buildBreakdownItem(row: CartRow, unitPrice: number): BreakdownItem {
  if (row.productVariant) {
    const variant = row.productVariant;
    const labelParts = [variant.size, variant.color].filter(
      (lookup): lookup is NonNullable<typeof lookup> => lookup != null,
    );
    const suffix = (key: "nameKa" | "nameEn" | "nameRu") =>
      labelParts.length > 0 ? ` (${labelParts.map((lookup) => lookup[key]).join(" / ")})` : "";

    return {
      itemType: row.itemType,
      productVariantId: variant.id,
      vehicleListingId: null,
      itemNameKa: `${variant.product.nameKa}${suffix("nameKa")}`,
      itemNameEn: `${variant.product.nameEn}${suffix("nameEn")}`,
      itemNameRu: `${variant.product.nameRu}${suffix("nameRu")}`,
      imageUrl: variant.images[0]?.imageUrl ?? variant.product.imageUrl ?? null,
      quantity: row.quantity,
      unitPrice,
      lineTotal: Math.round(unitPrice * row.quantity * 100) / 100,
      // Treated as zero stock when deactivated — reuses the existing
      // INSUFFICIENT_STOCK_ITEM guard in placeOrder below instead of a
      // separate check, catching a cart item that was active when added
      // but deactivated before checkout.
      stockQuantity: variant.isActive ? variant.stockQuantity : 0,
    };
  }

  const listing = row.vehicleListing!;
  return {
    itemType: row.itemType,
    productVariantId: null,
    vehicleListingId: listing.id,
    // Brand/Model names are locale-invariant (see [[vehicle_brand_model_naming]]) —
    // the same string snapshots into all three OrderItem name columns.
    itemNameKa: `${listing.vehicleCatalog.brand.name} ${listing.vehicleCatalog.model.name}`,
    itemNameEn: `${listing.vehicleCatalog.brand.name} ${listing.vehicleCatalog.model.name}`,
    itemNameRu: `${listing.vehicleCatalog.brand.name} ${listing.vehicleCatalog.model.name}`,
    imageUrl: listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl ?? null,
    quantity: row.quantity,
    unitPrice,
    lineTotal: Math.round(unitPrice * row.quantity * 100) / 100,
    // See the productVariant branch above for why this is zeroed instead of
    // a separate active-check.
    stockQuantity: listing.isActive ? listing.stockQuantity : 0,
  };
}

// Shared by both the checkout preview and the actual order placement (see
// previewCheckout/placeOrder below) so the two can never drift — the
// preview is just this same computation, unpersisted. Replicates the
// unitPrice derivation cart.service.ts's toResponse already does
// (base price vs. active ProductVariantDiscount/VehicleListingDiscount),
// then layers a promo-code discount on top per the admin-configured
// stacking setting.
export async function computeCheckoutTotals(userId: number, promoCodeInput?: string): Promise<CheckoutBreakdown> {
  const initialRows = await cartRepository.findByOwner({ userId });
  if (initialRows.length === 0) {
    throw new ApiError(400, "კალათა ცარიელია", "CART_EMPTY");
  }

  // Live stock refresh, scoped to exactly what's in this cart — pulls fresh
  // rest quantities from FINA and writes them straight to stockQuantity
  // before the breakdown below is built, so both the checkout preview and
  // placeOrder's own stock check (below) are working off current data, not
  // whatever the last scheduled/admin sync happened to leave behind.
  // VehicleListing items have no finaId and are skipped entirely — FINA
  // only tracks ProductVariant stock (see fina-sync.repository.ts).
  const productVariantIds = initialRows
    .map((row) => row.productVariant?.id)
    .filter((id): id is number => id != null);
  const finaConfirmed = await syncVariantStockByIds(productVariantIds);
  const cartRows = productVariantIds.length > 0 ? await cartRepository.findByOwner({ userId }) : initialRows;

  const stackingEnabled = await isPromoStackingEnabled();

  // Precomputed once, reused both for per-item pricing below and for the
  // cart-wide "would literally any promo code help" signal the checkout UI
  // uses to proactively disable the promo input (see promoCodeBlocked) —
  // every item already has an active discount, and stacking is off, so
  // layering any matching code on top of any of them would price identically
  // to not entering one at all.
  const itemDiscounts = cartRows.map((row) =>
    row.productVariant
      ? findActiveDiscount(row.productVariant.discounts)
      : row.vehicleListing
        ? findActiveDiscount(row.vehicleListing.discounts)
        : null,
  );
  const promoCodeBlocked = !stackingEnabled && itemDiscounts.every((discount) => discount !== null);

  let promoMatch: Awaited<ReturnType<typeof resolvePromoCodeForItems>> | null = null;
  if (promoCodeInput) {
    if (promoCodeBlocked) {
      throw new ApiError(
        400,
        "პრომო კოდის გამოყენება შეუძლებელია — კალათის ყველა ნივთს უკვე აქვს ფასდაკლება",
        "PROMO_CODE_NO_EFFECT",
      );
    }

    const matchItems = cartRows.map((row) => ({
      itemType: row.itemType,
      productVariantId: row.productVariant?.id ?? null,
      vehicleListingId: row.vehicleListing?.id ?? null,
    }));
    promoMatch = await resolvePromoCodeForItems(promoCodeInput, matchItems, userId);

    // Narrower than promoCodeBlocked above (which only fires when *every*
    // cart item is already discounted) — this catches the case where the
    // code's scope happens to only reach items that are already discounted
    // while some *other*, out-of-scope cart item isn't. Only meaningful when
    // stacking is off — with stacking on, an item already having a discount
    // never means zero effect (the promo still layers on top of it). Either
    // way, if the code would change literally none of the matched items'
    // prices, it must not be attached to the order: placeOrder records
    // promoCode.id on the order, and that's exactly what counts against the
    // code's usageLimit/one-per-customer limit (promo-codes.repository.ts's
    // countUsage/hasUserUsed) — so attaching a no-op match here would burn
    // the customer's code for zero benefit.
    const matchedItemsAllDiscounted =
      !stackingEnabled &&
      cartRows.every((row, index) => {
        const matchKey = promoCodeItemKey({
          itemType: row.itemType,
          productVariantId: row.productVariant?.id ?? null,
          vehicleListingId: row.vehicleListing?.id ?? null,
        });
        if (!promoMatch!.matchedKeys.has(matchKey)) return true;
        return itemDiscounts[index] !== null;
      });
    if (matchedItemsAllDiscounted) {
      throw new ApiError(
        400,
        "პრომო კოდის გამოყენება შეუძლებელია — შესაბამის ნივთებს უკვე აქვთ ფასდაკლება",
        "PROMO_CODE_NO_EFFECT",
      );
    }
  }

  let subtotal = 0;
  let total = 0;

  const items = cartRows.map((row, index) => {
    const baseUnitPrice = Number(row.productVariant?.price ?? row.vehicleListing?.price ?? 0);
    const activeDiscount = itemDiscounts[index];
    const hasActiveDiscount = activeDiscount !== null;
    const effectivePrice = activeDiscount ? Number(activeDiscount.discountPrice) : baseUnitPrice;

    const matchKey = promoCodeItemKey({
      itemType: row.itemType,
      productVariantId: row.productVariant?.id ?? null,
      vehicleListingId: row.vehicleListing?.id ?? null,
    });
    const promoApplies = promoMatch != null && promoMatch.matchedKeys.has(matchKey);

    // Deliberately rounds the PER-UNIT price to cents here, before the
    // quantity multiplication below — not the per-line subtotal. Both are
    // valid rounding policies and this codebase has picked per-unit
    // consistently everywhere (every `Math.round(x * 100) / 100` in this
    // function and buildRevenueSeries operates on a per-unit or per-order
    // total, never a rounded-then-re-multiplied line), so switching to
    // per-line here alone would make this one line disagree with every
    // other money computation's rounding basis instead of fixing anything.
    // The effect is bounded (at most ~1 cent per affected line, never
    // compounding across lines) and internally consistent: `lineTotal`
    // below is always literally `unitPrice * quantity`, and `total` is
    // built from summing these same already-rounded numbers — so the order
    // total and its stored line items can never drift from each other,
    // regardless of which rounding policy this comment is defending. A
    // genuine per-line-subtotal policy would be a deliberate, whole-codebase
    // migration (ideally onto Prisma.Decimal/decimal.js instead of
    // Math.round throughout), not a one-line fix here.
    let unitPrice: number;
    if (promoApplies && promoMatch) {
      if (hasActiveDiscount && !stackingEnabled) {
        unitPrice = effectivePrice;
      } else {
        const basis = stackingEnabled ? effectivePrice : baseUnitPrice;
        unitPrice = Math.round(basis * (1 - promoMatch.discountPercent / 100) * 100) / 100;
      }
    } else {
      unitPrice = effectivePrice;
    }

    subtotal += baseUnitPrice * row.quantity;
    total += unitPrice * row.quantity;

    return buildBreakdownItem(row, unitPrice);
  });

  subtotal = Math.round(subtotal * 100) / 100;
  total = Math.round(total * 100) / 100;

  return {
    items,
    cartItemIds: cartRows.map((row) => row.id),
    subtotal,
    discountTotal: Math.round((subtotal - total) * 100) / 100,
    total,
    promoCode: promoMatch
      ? { id: promoMatch.id, code: promoMatch.code, discountPercent: promoMatch.discountPercent }
      : null,
    promoCodeBlocked,
    finaConfirmed,
  };
}

type DeliveryResolution = {
  addressId: number | null;
  shippingSnapshot: Prisma.InputJsonValue | undefined;
  deliverySpeed: OrderDeliverySpeed | null;
  deliveryCost: number;
  deliveryTimeSnapshot: string | null;
};

// Shared by previewCheckout and placeOrder so the live checkout summary can
// never drift from what actually gets persisted. PICKUP needs no address or
// delivery pricing at all (same condition placeOrder already used for
// shippingSnapshot). EXPRESS is a flat rate regardless of city (confirmed
// independent of Tbilisi/regions); STANDARD resolves off the address's
// City.isTbilisi flag — see settings.service.ts's getDeliveryTbilisiPrice/
// getDeliveryRegionsPrice/getDeliveryExpressPrice.
async function resolveDelivery(
  userId: number,
  fulfillmentMethod: OrderFulfillmentMethod,
  addressId: number | undefined,
  deliverySpeed: OrderDeliverySpeed | undefined,
): Promise<DeliveryResolution> {
  if (fulfillmentMethod === "PICKUP") {
    return {
      addressId: null,
      shippingSnapshot: undefined,
      deliverySpeed: null,
      deliveryCost: 0,
      deliveryTimeSnapshot: null,
    };
  }

  const address = addressId ? await addressesRepository.findById(addressId) : null;
  if (!address || address.userId !== userId) {
    throw new ApiError(404, "მისამართი ვერ მოიძებნა", "ADDRESS_NOT_FOUND");
  }

  const speed: OrderDeliverySpeed = deliverySpeed === "EXPRESS" ? "EXPRESS" : "STANDARD";
  const [deliveryCost, deliveryTimeSnapshot] =
    speed === "EXPRESS"
      ? await Promise.all([getDeliveryExpressPrice(), getDeliveryExpressTime()])
      : address.city.isTbilisi
        ? await Promise.all([getDeliveryTbilisiPrice(), getDeliveryTbilisiTime()])
        : await Promise.all([getDeliveryRegionsPrice(), getDeliveryRegionsTime()]);

  return {
    addressId: address.id,
    shippingSnapshot: {
      phone: address.phone,
      city: {
        id: address.city.id,
        key: address.city.key,
        nameKa: address.city.nameKa,
        nameEn: address.city.nameEn,
        nameRu: address.city.nameRu,
        isTbilisi: address.city.isTbilisi,
      },
      street: address.street,
      building: address.building,
      apartment: address.apartment,
      postalCode: address.postalCode,
    },
    deliverySpeed: speed,
    deliveryCost,
    deliveryTimeSnapshot,
  };
}

// Only meaningful for CARD — COURIER/PICKUP never carry a bank. Shared by
// placeOrder below (checkoutInputSchema's superRefine already requires
// bankId when fulfillmentMethod=CARD, but that's just presence — this is
// where "does it actually exist and is it active" gets checked).
async function resolveBank(
  fulfillmentMethod: OrderFulfillmentMethod,
  bankId: number | undefined,
): Promise<number | null> {
  if (fulfillmentMethod !== "CARD") return null;

  const bank = bankId ? await banksRepository.findById(bankId) : null;
  if (!bank || !bank.isActive) {
    throw new ApiError(400, "მითითებული ბანკი ვერ მოიძებნა ან აღარ არის აქტიური", "BANK_NOT_FOUND");
  }
  return bank.id;
}

function toItemResponse(
  item: { id: number | null } & Omit<PlaceOrderItemInput, "vehicleListingId">,
) {
  return {
    id: item.id,
    itemType: item.itemType,
    productVariantId: item.productVariantId ?? null,
    itemName: { ka: item.itemNameKa, en: item.itemNameEn, ru: item.itemNameRu },
    imageUrl: item.imageUrl ?? null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  };
}

// Stock status per item (and the overall hasStockIssues flag) is only
// meaningful here — the freshly-synced preview — not on toOrderResponse's
// persisted items below, since a placed order never re-checks live stock
// after the fact.
function toBreakdownResponse(breakdown: CheckoutBreakdown, delivery: DeliveryResolution) {
  return {
    items: breakdown.items.map((item) => ({
      ...toItemResponse({ ...item, id: null }),
      inStock: item.quantity <= item.stockQuantity,
      availableQuantity: item.stockQuantity,
    })),
    subtotal: breakdown.subtotal,
    discountTotal: breakdown.discountTotal,
    deliverySpeed: delivery.deliverySpeed,
    deliveryCost: delivery.deliveryCost,
    deliveryTimeSnapshot: delivery.deliveryTimeSnapshot,
    total: Math.round((breakdown.total + delivery.deliveryCost) * 100) / 100,
    promoCode: breakdown.promoCode
      ? { code: breakdown.promoCode.code, discountPercent: breakdown.promoCode.discountPercent }
      : null,
    promoCodeBlocked: breakdown.promoCodeBlocked,
    hasStockIssues: breakdown.items.some((item) => item.quantity > item.stockQuantity),
  };
}

// Checkout-only gate (see user.prisma's emailVerifiedAt comment) — login,
// browsing, cart, and order history all stay unaffected by verification
// status. Returns the full user row so placeOrder can reuse createdAt for
// evaluateOrderRisk's NEW_ACCOUNT_HIGH_VALUE check without a second lookup.
async function assertEmailVerified(userId: number) {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "მომხმარებელი ვერ მოიძებნა", "USER_NOT_FOUND");
  }
  if (!user.emailVerifiedAt) {
    throw new ApiError(403, "შეკვეთის გასაფორმებლად საჭიროა ელფოსტის დადასტურება", "EMAIL_VERIFICATION_REQUIRED");
  }
  return user;
}

export async function previewCheckout(userId: number, input: CheckoutInput) {
  await assertEmailVerified(userId);
  const breakdown = await computeCheckoutTotals(userId, input.promoCode);
  const delivery = await resolveDelivery(userId, input.fulfillmentMethod, input.addressId, input.deliverySpeed);
  return toBreakdownResponse(breakdown, delivery);
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof ordersRepository.findById>>>;

// Shared with orders-query.service.ts (getMyOrder/getAnyOrder) and
// orders-admin.service.ts (toOrderStatusUpdateResponse) — every order-reading
// surface maps through this one function so the response shape can never
// drift between them.
export function toOrderResponse(order: OrderRow) {
  return {
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    fulfillmentMethod: order.fulfillmentMethod,
    shippingSnapshot: order.shippingSnapshot as {
      phone: string;
      city: { id: number; key: string; nameKa: string; nameEn: string; nameRu: string; isTbilisi: boolean };
      street: string;
      building: string | null;
      apartment: string | null;
      postalCode: string | null;
    } | null,
    promoCode:
      order.promoCodeSnapshot != null
        ? { code: order.promoCodeSnapshot, discountPercent: Number(order.promoDiscountPercent) }
        : null,
    bank: order.bank
      ? {
          id: order.bank.id,
          key: order.bank.key,
          name: { ka: order.bank.nameKa, en: order.bank.nameEn, ru: order.bank.nameRu },
          logoUrl: order.bank.logoUrl,
        }
      : null,
    paymentStatus: order.paymentStatus,
    paymentTransactionId: order.paymentTransactionId,
    paidAt: order.paidAt,
    paymentPlanLabel: order.paymentPlanLabel,
    items: order.items.map((item) =>
      toItemResponse({
        id: item.id,
        itemType: item.itemType,
        productVariantId: item.productVariantId,
        itemNameKa: item.itemNameKa,
        itemNameEn: item.itemNameEn,
        itemNameRu: item.itemNameRu,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      }),
    ),
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discountTotal),
    deliverySpeed: order.deliverySpeed,
    deliveryCost: Number(order.deliveryCost),
    deliveryTimeSnapshot: order.deliveryTimeSnapshot,
    total: Number(order.total),
    createdAt: order.createdAt,
  };
}

export async function placeOrder(userId: number, input: CheckoutInput, ipAddress: string | null) {
  // Double-click / timeout-retry protection: a retry of an already-placed
  // order carries the exact same idempotencyKey (see CheckoutManager.tsx),
  // so this returns the original order instead of re-running checkout — the
  // retry's cart would already be empty from the first successful call
  // (placeOrder below clears it), which would otherwise surface as a
  // confusing "კალათა ცარიელია" error rather than the order the customer
  // already placed.
  // Scoped to this user — idempotencyKey is a random client-generated UUID
  // (see CheckoutManager.tsx), so a genuine cross-user collision is not a
  // realistic concern, but this keeps a lookup keyed off client-supplied
  // input from ever returning another user's order.
  const existingByKey = await ordersRepository.findByIdempotencyKey(input.idempotencyKey);
  if (existingByKey && existingByKey.userId === userId) {
    // A genuine retry finds the cart already empty — the first successful
    // call cleared it as part of its own transaction, so there's nothing new
    // to reconcile and it's safe to just hand back the order already placed.
    // But a non-empty cart here means the customer added something *since*
    // that success — almost always because its response never reached them,
    // so they assumed the attempt failed and are trying again. Silently
    // returning the stale order in that case would bury the new cart content
    // with zero explanation (and zero way for the customer to ever check out
    // for it, since idempotencyKey is fixed for the page's lifetime — see
    // CheckoutManager.tsx). Refuse instead, so the client can surface a
    // clear "your cart changed" message and mint a fresh idempotencyKey for
    // an actual new attempt.
    const currentCartRows = await cartRepository.findByOwner({ userId });
    if (currentCartRows.length === 0) {
      return toOrderResponse(existingByKey);
    }
    throw new ApiError(
      409,
      "თქვენი კალათა შეიცვალა წინა შეკვეთის მცდელობის შემდეგ — გთხოვთ განაახლოთ გვერდი და სცადოთ თავიდან",
      "IDEMPOTENCY_KEY_CART_CHANGED",
    );
  }

  const user = await assertEmailVerified(userId);
  const breakdown = await computeCheckoutTotals(userId, input.promoCode);

  for (const item of breakdown.items) {
    if (item.quantity > item.stockQuantity) {
      // All three name snapshots passed as params (not just itemNameKa) —
      // the backend has no request-locale awareness (see ApiError.ts), so
      // it can't pick the "right" one itself; each Errors.*.json locale's
      // INSUFFICIENT_STOCK_ITEM template references whichever of
      // itemNameKa/itemNameEn/itemNameRu matches its own language instead.
      // availableQuantity names exactly how many are actually left, rather
      // than a generic "not enough in stock" — this is the customer-facing
      // moment a cart quantity that got out of sync with real stock
      // (e.g. via the guest-cart merge on login, which deliberately never
      // silently shrinks a quantity — see cart.repository.ts's
      // mergeGuestItem) is surfaced, so it needs to be actionable.
      throw new ApiError(
        409,
        `"${item.itemNameKa}" — მარაგშია მხოლოდ ${item.stockQuantity} ცალი`,
        "INSUFFICIENT_STOCK_ITEM",
        {
          itemNameKa: item.itemNameKa,
          itemNameEn: item.itemNameEn,
          itemNameRu: item.itemNameRu,
          availableQuantity: item.stockQuantity,
        },
      );
    }
  }

  const delivery = await resolveDelivery(userId, input.fulfillmentMethod, input.addressId, input.deliverySpeed);
  const bankId = await resolveBank(input.fulfillmentMethod, input.bankId);

  const items: PlaceOrderItemInput[] = breakdown.items.map(({ stockQuantity: _stockQuantity, ...item }) => item);
  const total = Math.round((breakdown.total + delivery.deliveryCost) * 100) / 100;
  const promoCodeId = breakdown.promoCode?.id ?? null;

  const [statusId, soldStatusId] = await Promise.all([
    resolveInitialOrderStatusId(breakdown.finaConfirmed),
    resolveSoldStatusId(),
  ]);

  for (let attempt = 0; attempt < MAX_ORDER_CODE_ATTEMPTS; attempt++) {
    try {
      const order = await ordersRepository.placeOrder({
        orderCode: generateOrderCode(),
        idempotencyKey: input.idempotencyKey,
        userId,
        fulfillmentMethod: input.fulfillmentMethod,
        statusId,
        addressId: delivery.addressId,
        shippingSnapshot: delivery.shippingSnapshot,
        bankId,
        promoCodeId,
        promoCodeSnapshot: breakdown.promoCode?.code ?? null,
        promoDiscountPercent: breakdown.promoCode?.discountPercent ?? null,
        subtotal: breakdown.subtotal,
        discountTotal: breakdown.discountTotal,
        deliverySpeed: delivery.deliverySpeed,
        deliveryCost: delivery.deliveryCost,
        deliveryTimeSnapshot: delivery.deliveryTimeSnapshot,
        total,
        ipAddress,
        // No gateway integration exists yet (see PaymentStatus's own
        // comment) — this is purely additive labeling for now.
        paymentStatus: input.fulfillmentMethod === "CARD" ? "AWAITING_PAYMENT" : "NOT_APPLICABLE",
        items,
        soldStatusId,
        cartItemIds: breakdown.cartItemIds,
      });

      await sendEmailTemplate("ORDER_PLACED", order.user.email, {
        customerName: `${order.user.firstName} ${order.user.lastName}`.trim(),
        orderCode: order.orderCode,
        total: Number(order.total).toFixed(2),
      });

      const adminNotificationEmail = await getAdminNotificationEmail();
      if (adminNotificationEmail) {
        await sendEmailTemplate("NEW_ORDER_ADMIN", adminNotificationEmail, {
          customerName: `${order.user.firstName} ${order.user.lastName}`.trim(),
          orderCode: order.orderCode,
          total: Number(order.total).toFixed(2),
        });
      }

      // Never throws (see fraud.service.ts) — safe to await inline without
      // its own try/catch here.
      await evaluateOrderRisk(
        { id: order.id, userId, total: Number(order.total), promoCodeId, ipAddress },
        user.createdAt,
      );

      // Never throws (see fina-sync.service.ts) — best-effort, same as
      // evaluateOrderRisk above.
      await pushOrderSale({
        id: order.id,
        orderCode: order.orderCode,
        items: order.items.map((item) => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      });

      return toOrderResponse(order);
    } catch (error) {
      if (isOrderCodeCollision(error) && attempt < MAX_ORDER_CODE_ATTEMPTS - 1) {
        continue;
      }
      // True-concurrency case: two requests carrying the same idempotencyKey
      // both passed the early findByIdempotencyKey check above before either
      // had committed. Not a retry — fetch and return the order the other
      // request just created, instead of erroring or looping.
      if (isIdempotencyKeyCollision(error)) {
        const winner = await ordersRepository.findByIdempotencyKey(input.idempotencyKey);
        if (winner && winner.userId === userId) {
          return toOrderResponse(winner);
        }
      }
      throw error;
    }
  }

  throw new ApiError(500, "შეკვეთის კოდის გენერაცია ვერ მოხერხდა", "INTERNAL_CONFIG_ERROR");
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// deliveryTimeSnapshot is free text an admin types into Settings (e.g.
// "1-2 სამუშაო დღე", "3-5 სამუშაო დღე", "2-4 საათი" — see
// settings.schema.ts's delivery*Time fields), not a structured min/max
// field, so this is necessarily an estimate: take the largest number found
// in the text and add it to createdAt. Unit is inferred from deliverySpeed
// rather than parsed from the text itself — EXPRESS orders' snapshot always
// comes from deliveryExpressTime (hours), everything else (STANDARD) from
// deliveryTbilisiTime/deliveryRegionsTime (days) — since that's reliably
// known and parsing a unit out of free-form Georgian text is not. Returns
// null for PICKUP orders (no deliveryTimeSnapshot at all) or if the admin's
// text has no digits to parse.
//
// Shared with orders-query.service.ts's listMyOrders/listAllOrders.
export function computeEstimatedDeliveryDate(
  createdAt: Date,
  deliverySpeed: OrderDeliverySpeed | null,
  deliveryTimeSnapshot: string | null,
): Date | null {
  if (!deliveryTimeSnapshot) return null;

  const numbers = deliveryTimeSnapshot.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;

  const maxUnits = Math.max(...numbers.map(Number));
  const msPerUnit = deliverySpeed === "EXPRESS" ? MS_PER_HOUR : MS_PER_DAY;
  return new Date(createdAt.getTime() + maxUnits * msPerUnit);
}

// See orders-query.service.ts for listMyOrders/getMyOrder/reorderOrder and
// orders-admin.service.ts for updateOrderStatus/retryOrderFinaSync/
// confirmOrderAfterFinaCheck — both import the helpers above.
