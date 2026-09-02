import { randomInt } from "node:crypto";
import { ApiError } from "../../lib/ApiError.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import {
  Prisma,
  type CartItemType,
  type EmailTemplateKey,
  type OrderDeliverySpeed,
  type OrderFulfillmentMethod,
} from "../../generated/prisma/index.js";
import { cartRepository, type CartOwner } from "../cart/cart.repository.js";
import { addCartItem } from "../cart/cart.service.js";
import { addressesRepository } from "../addresses/addresses.repository.js";
import { banksRepository } from "../banks/banks.repository.js";
import { usersRepository } from "../users/users.repository.js";
import {
  syncVariantStockByIds,
  pushOrderSale,
  pushOrderReturn,
  retryOrderFinaPush,
} from "../fina-sync/fina-sync.service.js";
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
} from "../settings/settings.service.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { orderStatusesRepository } from "../order-statuses/order-statuses.repository.js";
import { ordersRepository, type PlaceOrderItemInput } from "./orders.repository.js";
import type { CheckoutInput, ListOrdersQuery } from "./orders.schema.js";

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
async function resolveInitialOrderStatusId(finaConfirmed: boolean): Promise<number> {
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
async function resolveSoldStatusId(): Promise<number> {
  const status = await lookupsRepository.findByKey(getLookupDelegate("listing-statuses"), "SOLD");
  if (!status) {
    throw new ApiError(500, "„გაყიდულია“ სტატუსი ვერ მოიძებნა — გაუშვით prisma/seed.ts", "INTERNAL_CONFIG_ERROR");
  }
  return status.id;
}

// Same pattern, used by updateOrderStatus below to flip a variant/listing
// back off SOLD when a cancellation restores the stock that drove it there.
async function resolveAvailableStatusId(): Promise<number> {
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
  subtotal: number;
  discountTotal: number;
  total: number;
  promoCode: { id: number; code: string; discountPercent: number } | null;
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

  let promoMatch: Awaited<ReturnType<typeof resolvePromoCodeForItems>> | null = null;
  if (promoCodeInput) {
    const matchItems = cartRows.map((row) => ({
      itemType: row.itemType,
      productVariantId: row.productVariant?.id ?? null,
      vehicleListingId: row.vehicleListing?.id ?? null,
    }));
    promoMatch = await resolvePromoCodeForItems(promoCodeInput, matchItems, userId);
  }

  let subtotal = 0;
  let total = 0;

  const items = cartRows.map((row) => {
    const baseUnitPrice = Number(row.productVariant?.price ?? row.vehicleListing?.price ?? 0);
    const activeDiscount = row.productVariant
      ? findActiveDiscount(row.productVariant.discounts)
      : row.vehicleListing
        ? findActiveDiscount(row.vehicleListing.discounts)
        : null;
    const hasActiveDiscount = activeDiscount !== null;
    const effectivePrice = activeDiscount ? Number(activeDiscount.discountPrice) : baseUnitPrice;

    const matchKey = promoCodeItemKey({
      itemType: row.itemType,
      productVariantId: row.productVariant?.id ?? null,
      vehicleListingId: row.vehicleListing?.id ?? null,
    });
    const promoApplies = promoMatch != null && promoMatch.matchedKeys.has(matchKey);

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
    subtotal,
    discountTotal: Math.round((subtotal - total) * 100) / 100,
    total,
    promoCode: promoMatch
      ? { id: promoMatch.id, code: promoMatch.code, discountPercent: promoMatch.discountPercent }
      : null,
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

function toOrderResponse(order: OrderRow) {
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
    return toOrderResponse(existingByKey);
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
        items,
        soldStatusId,
      });

      await sendEmailTemplate("ORDER_PLACED", order.user.email, {
        customerName: `${order.user.firstName} ${order.user.lastName}`.trim(),
        orderCode: order.orderCode,
        total: Number(order.total).toFixed(2),
      });

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
function computeEstimatedDeliveryDate(
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

export async function listMyOrders(userId: number) {
  const rows = await ordersRepository.findByUserId(userId);
  return rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    total: Number(row.total),
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.createdAt,
    estimatedDeliveryDate: computeEstimatedDeliveryDate(
      row.createdAt,
      row.deliverySpeed,
      row.deliveryTimeSnapshot,
    ),
  }));
}

export async function getMyOrder(userId: number, id: number) {
  const row = await ordersRepository.findById(id);
  if (!row || row.userId !== userId) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა", "ORDER_NOT_FOUND");
  }
  return toOrderResponse(row);
}

// Recovers how much of *this* reorder request actually landed in the cart —
// addCartItem's own return value is the item's resulting total quantity,
// which already includes whatever was in the cart before this call (e.g.
// the shopper already had 1 in their cart and this call asked for 2 more:
// addCartItem returns 3, not the 2 this call contributed). Comparing
// against the pre-call quantity isolates just this call's contribution,
// which is what the per-item ADDED/PARTIAL/UNAVAILABLE status below needs.
async function reorderAddedQuantity(
  owner: CartOwner,
  input: {
    itemType: CartItemType;
    productVariantId: number | null;
    vehicleListingId: number | null;
    quantity: number;
  },
): Promise<number> {
  const existing =
    input.productVariantId != null
      ? await cartRepository.findByOwnerAndProductVariant(owner, input.productVariantId)
      : input.vehicleListingId != null
        ? await cartRepository.findByOwnerAndVehicleListing(owner, input.vehicleListingId)
        : null;
  const beforeQuantity = existing?.quantity ?? 0;

  try {
    const result = await addCartItem(owner, {
      itemType: input.itemType,
      productVariantId: input.productVariantId,
      vehicleListingId: input.vehicleListingId,
      quantity: input.quantity,
    });
    return result.quantity - beforeQuantity;
  } catch {
    // addCartItem throws when the variant/listing no longer exists or has
    // zero stock left — either way, this item just isn't reorderable.
    return 0;
  }
}

// "Buy again" from a past order — re-adds each line item to the caller's
// own cart (never a guest cart; order history is login-only). Deliberately
// per-item best-effort rather than all-or-nothing: an item whose product
// was deleted or has sold out doesn't block the rest of the order from
// being re-added, it's just reported as UNAVAILABLE (or PARTIAL if only
// some of the requested quantity is still in stock). Reuses addCartItem for
// the actual stock/existence validation and quantity capping instead of
// duplicating that logic here.
export async function reorderOrder(userId: number, id: number) {
  const order = await ordersRepository.findById(id);
  if (!order || order.userId !== userId) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა", "ORDER_NOT_FOUND");
  }

  const owner: CartOwner = { userId };
  const items: {
    itemName: { ka: string; en: string; ru: string };
    requestedQuantity: number;
    addedQuantity: number;
    status: "ADDED" | "PARTIAL" | "UNAVAILABLE";
  }[] = [];

  // Sequential, not Promise.all — each iteration mutates the same cart, so
  // running them concurrently would race on "does a row for this item
  // already exist" the same way BuyTogether's frontend add-all already
  // avoids for the same reason.
  for (const item of order.items) {
    const itemName = { ka: item.itemNameKa, en: item.itemNameEn, ru: item.itemNameRu };

    if (item.productVariantId == null && item.vehicleListingId == null) {
      // The source product/vehicle listing was deleted after this order was
      // placed (OrderItem's FKs are SetNull-on-delete) — nothing to re-add.
      items.push({ itemName, requestedQuantity: item.quantity, addedQuantity: 0, status: "UNAVAILABLE" });
      continue;
    }

    const addedQuantity = await reorderAddedQuantity(owner, {
      itemType: item.itemType,
      productVariantId: item.productVariantId,
      vehicleListingId: item.vehicleListingId,
      quantity: item.quantity,
    });

    const status =
      addedQuantity <= 0 ? "UNAVAILABLE" : addedQuantity < item.quantity ? "PARTIAL" : "ADDED";

    items.push({
      itemName,
      requestedQuantity: item.quantity,
      addedQuantity: Math.max(addedQuantity, 0),
      status,
    });
  }

  return { items };
}

// Admin-only from here down — every caller of these is already gated by
// requireRole(ROLES.ADMIN) in orders.routes.ts, so unlike listMyOrders/
// getMyOrder above these never scope by owner.

// Real server-side pagination (skip/take), same pattern as error-logs.
// Default pageSize (20) matches the client-side page size everyone is used
// to — see frontend's shared Pagination.tsx's DEFAULT_PAGE_SIZE.
const DEFAULT_ADMIN_ORDERS_PAGE_SIZE = 20;

export async function listAllOrders(filters: ListOrdersQuery) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_ADMIN_ORDERS_PAGE_SIZE;

  const [rows, total] = await Promise.all([
    ordersRepository.findManyAdmin(filters, (page - 1) * pageSize, pageSize),
    ordersRepository.count(filters),
  ]);

  const orders = rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    fulfillmentMethod: row.fulfillmentMethod,
    total: Number(row.total),
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.createdAt,
    buyer: row.user,
    hasRiskFlags: row._count.riskFlags > 0,
    finaSyncStatus: row.finaSyncStatus,
    estimatedDeliveryDate: computeEstimatedDeliveryDate(
      row.createdAt,
      row.deliverySpeed,
      row.deliveryTimeSnapshot,
    ),
  }));

  return { orders, total, page, pageSize };
}

export async function getAnyOrder(id: number) {
  const row = await ordersRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }
  // riskFlags is only ever surfaced here (admin) — toOrderResponse itself is
  // shared with the customer-facing getMyOrder, which must never see them.
  return {
    ...toOrderResponse(row),
    buyer: row.user,
    riskFlags: row.riskFlags.map((flag) => ({
      type: flag.type,
      detail: flag.detail,
      createdAt: flag.createdAt,
    })),
    finaSyncStatus: row.finaSyncStatus,
    finaOutOperationId: row.finaOutOperationId,
  };
}

// Only the statuses a customer would actually want a notification about —
// PENDING (the starting status, already covered by the ORDER_PLACED email)
// and any custom status an admin later adds via General Classifiers simply
// don't send anything.
const STATUS_KEY_TO_EMAIL_TEMPLATE: Partial<Record<string, EmailTemplateKey>> = {
  CONFIRMED: "ORDER_CONFIRMED",
  SHIPPED: "ORDER_SHIPPED",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
};

export async function updateOrderStatus(
  id: number,
  statusId: number,
  cancellationReasonId?: number,
  cancellationNote?: string,
) {
  const status = await orderStatusesRepository.findById(statusId);
  if (!status) {
    throw new ApiError(400, "მითითებული სტატუსი არ არსებობს");
  }

  const isCancelling = status.key === "CANCELLED";
  if (isCancelling && cancellationReasonId == null) {
    throw new ApiError(400, "შეკვეთის გაუქმებისას მიზეზის მითითება საჭიროა");
  }
  if (isCancelling) {
    const reason = await lookupsRepository.findById(
      getLookupDelegate("cancellation-reasons"),
      cancellationReasonId!,
    );
    if (!reason) {
      throw new ApiError(400, "მითითებული მიზეზი ვერ მოიძებნა");
    }
  }

  const existing = await ordersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }

  const wasCancelled = existing.status.key === "CANCELLED";

  // Cancelling restores the stock placeOrder originally decremented;
  // un-cancelling (an admin moving a CANCELLED order to any other status)
  // has to take it back the same way placeOrder did — otherwise toggling an
  // order's status back and forth would inflate stock for free. Any other
  // transition (e.g. CONFIRMED -> SHIPPED) never touched stock, so it's left
  // alone here too.
  let stockAdjustment: Parameters<typeof ordersRepository.updateStatus>[3];
  if (isCancelling !== wasCancelled) {
    const [soldStatusId, availableStatusId] = await Promise.all([
      resolveSoldStatusId(),
      resolveAvailableStatusId(),
    ]);
    stockAdjustment = {
      direction: isCancelling ? "RESTORE" : "DECREMENT",
      items: existing.items.map((item) => ({
        productVariantId: item.productVariantId,
        vehicleListingId: item.vehicleListingId,
        quantity: item.quantity,
        itemNameKa: item.itemNameKa,
      })),
      soldStatusId,
      availableStatusId,
    };
  }

  const order = await ordersRepository.updateStatus(
    id,
    statusId,
    {
      cancellationReasonId: isCancelling ? cancellationReasonId! : null,
      cancellationNote: isCancelling ? (cancellationNote ?? null) : null,
    },
    stockAdjustment,
    existing.statusId,
  );

  // Only the RESTORE direction (a fresh cancel) mirrors into FINA — un-cancel
  // (DECREMENT) re-takes the local stock but deliberately doesn't re-push a
  // second FINA sale, which is out of scope here (see fina_sync_integration
  // memory). Never throws — same best-effort contract as pushOrderSale.
  if (stockAdjustment?.direction === "RESTORE") {
    await pushOrderReturn({
      id: existing.id,
      orderCode: existing.orderCode,
      finaOutOperationId: existing.finaOutOperationId,
      items: existing.items.map((item) => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    });
  }

  const templateKey = STATUS_KEY_TO_EMAIL_TEMPLATE[status.key];
  if (templateKey) {
    await sendEmailTemplate(templateKey, order.user.email, {
      customerName: `${order.user.firstName} ${order.user.lastName}`.trim(),
      orderCode: order.orderCode,
      total: Number(order.total).toFixed(2),
    });
  }

  return {
    ...toOrderResponse(order),
    buyer: order.user,
    riskFlags: order.riskFlags.map((flag) => ({
      type: flag.type,
      detail: flag.detail,
      createdAt: flag.createdAt,
    })),
    cancellationReason: order.cancellationReason
      ? {
          id: order.cancellationReason.id,
          key: order.cancellationReason.key,
          nameKa: order.cancellationReason.nameKa,
          nameEn: order.cancellationReason.nameEn,
          nameRu: order.cancellationReason.nameRu,
        }
      : null,
    cancellationNote: order.cancellationNote,
    finaSyncStatus: order.finaSyncStatus,
    finaOutOperationId: order.finaOutOperationId,
  };
}

// Admin-triggered manual retry of pushOrderSale/pushOrderReturn (see
// fina-sync.service.ts's retryOrderFinaPush) — for an order whose
// finaSyncStatus is FAILED (or, in principle, any order, though retrying a
// NOT_APPLICABLE/SYNCED one just re-confirms there's nothing to do or
// re-pushes redundantly). Direction (sale vs. return) is derived from the
// order's current status, not tracked separately, so this always retries
// whatever the automatic paths would have attempted for this order right now.
export async function retryOrderFinaSync(orderId: number) {
  const order = await ordersRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }

  await retryOrderFinaPush({
    id: order.id,
    orderCode: order.orderCode,
    isCancelled: order.status.key === "CANCELLED",
    finaOutOperationId: order.finaOutOperationId,
    items: order.items.map((item) => ({
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  });

  return getAnyOrder(orderId);
}

// Closes the loop left open when computeCheckoutTotals's live FINA check
// couldn't confirm this order at placeOrder time (see
// resolveInitialOrderStatusId above) and it started life as PENDING: called
// after an admin's on-demand FINA stock re-check (see
// fina-sync.controller.ts's syncOrder) succeeds in reaching FINA for every
// one of this order's linked items. Returns null — a no-op — for any order
// that isn't currently PENDING, so re-checking an already-confirmed order
// never re-fires its ORDER_CONFIRMED email or overwrites a status an admin
// set by hand since.
export async function confirmOrderAfterFinaCheck(orderId: number) {
  const order = await ordersRepository.findById(orderId);
  if (!order || order.status.key !== "PENDING") return null;

  const confirmedStatusId = await resolveInitialOrderStatusId(true);
  return updateOrderStatus(orderId, confirmedStatusId);
}
