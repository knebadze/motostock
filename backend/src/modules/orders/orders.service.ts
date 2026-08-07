import { randomInt } from "node:crypto";
import { ApiError } from "../../lib/ApiError.js";
import { Prisma } from "../../generated/prisma/index.js";
import { cartRepository } from "../cart/cart.repository.js";
import { addressesRepository } from "../addresses/addresses.repository.js";
import { resolvePromoCodeForItems, promoCodeItemKey } from "../promo-codes/promo-codes.service.js";
import { isPromoStackingEnabled } from "../settings/settings.service.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
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

// The "order-statuses" lookup (see order-status.prisma / lookups.registry.ts)
// replaced the old hardcoded OrderStatus enum — every new order needs a
// starting status resolved by its stable `key` rather than relying on a
// fragile "row id 1" assumption. Throws loudly if the lookup wasn't seeded
// (see prisma/seed.ts's ORDER_STATUSES) instead of silently failing later.
async function resolvePendingStatusId(): Promise<number> {
  const status = await lookupsRepository.findByKey(getLookupDelegate("order-statuses"), "PENDING");
  if (!status) {
    throw new ApiError(500, "შეკვეთის საწყისი სტატუსი ვერ მოიძებნა — გაუშვით prisma/seed.ts");
  }
  return status.id;
}

function isOrderCodeCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) && target.includes("orderCode");
}

type DiscountRow = { startDate: Date; endDate: Date; discountPrice: { toString(): string } };

function findActiveDiscount<T extends DiscountRow>(discounts: T[]): T | null {
  const now = new Date();
  return discounts.find((discount) => discount.startDate <= now && now <= discount.endDate) ?? null;
}

type CartRow = Awaited<ReturnType<typeof cartRepository.findByOwner>>[number];

type BreakdownItem = PlaceOrderItemInput & { stockQuantity: number };

type CheckoutBreakdown = {
  items: BreakdownItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  promoCode: { id: number; code: string; discountPercent: number } | null;
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
      stockQuantity: variant.stockQuantity,
    };
  }

  const listing = row.vehicleListing!;
  return {
    itemType: row.itemType,
    productVariantId: null,
    vehicleListingId: listing.id,
    itemNameKa: `${listing.vehicleCatalog.brand.nameKa} ${listing.vehicleCatalog.model.nameKa}`,
    itemNameEn: `${listing.vehicleCatalog.brand.nameEn} ${listing.vehicleCatalog.model.nameEn}`,
    itemNameRu: `${listing.vehicleCatalog.brand.nameRu} ${listing.vehicleCatalog.model.nameRu}`,
    imageUrl: listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl ?? null,
    quantity: row.quantity,
    unitPrice,
    lineTotal: Math.round(unitPrice * row.quantity * 100) / 100,
    stockQuantity: listing.stockQuantity,
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
  const cartRows = await cartRepository.findByOwner({ userId });
  if (cartRows.length === 0) {
    throw new ApiError(400, "კალათა ცარიელია");
  }

  const stackingEnabled = await isPromoStackingEnabled();

  let promoMatch: Awaited<ReturnType<typeof resolvePromoCodeForItems>> | null = null;
  if (promoCodeInput) {
    const matchItems = cartRows.map((row) => ({
      itemType: row.itemType,
      productVariantId: row.productVariant?.id ?? null,
      vehicleListingId: row.vehicleListing?.id ?? null,
    }));
    promoMatch = await resolvePromoCodeForItems(promoCodeInput, matchItems);
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
  };
}

function toItemResponse(item: { id: number | null } & Omit<PlaceOrderItemInput, "productVariantId" | "vehicleListingId">) {
  return {
    id: item.id,
    itemType: item.itemType,
    itemName: { ka: item.itemNameKa, en: item.itemNameEn, ru: item.itemNameRu },
    imageUrl: item.imageUrl ?? null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  };
}

function toBreakdownResponse(breakdown: CheckoutBreakdown) {
  return {
    items: breakdown.items.map((item) => toItemResponse({ ...item, id: null })),
    subtotal: breakdown.subtotal,
    discountTotal: breakdown.discountTotal,
    total: breakdown.total,
    promoCode: breakdown.promoCode
      ? { code: breakdown.promoCode.code, discountPercent: breakdown.promoCode.discountPercent }
      : null,
  };
}

export async function previewCheckout(userId: number, input: CheckoutInput) {
  const breakdown = await computeCheckoutTotals(userId, input.promoCode);
  return toBreakdownResponse(breakdown);
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
      city: { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };
      street: string;
      building: string | null;
      apartment: string | null;
      postalCode: string | null;
    } | null,
    promoCode:
      order.promoCodeSnapshot != null
        ? { code: order.promoCodeSnapshot, discountPercent: Number(order.promoDiscountPercent) }
        : null,
    items: order.items.map((item) =>
      toItemResponse({
        id: item.id,
        itemType: item.itemType,
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
    total: Number(order.total),
    createdAt: order.createdAt,
  };
}

export async function placeOrder(userId: number, input: CheckoutInput) {
  const breakdown = await computeCheckoutTotals(userId, input.promoCode);

  for (const item of breakdown.items) {
    if (item.quantity > item.stockQuantity) {
      throw new ApiError(409, `"${item.itemNameKa}" — მარაგში საკმარისი რაოდენობა აღარ არის`);
    }
  }

  let addressId: number | null = null;
  let shippingSnapshot: Prisma.InputJsonValue | undefined;
  if (input.fulfillmentMethod !== "PICKUP") {
    const address = input.addressId ? await addressesRepository.findById(input.addressId) : null;
    if (!address || address.userId !== userId) {
      throw new ApiError(404, "მისამართი ვერ მოიძებნა");
    }
    addressId = address.id;
    shippingSnapshot = {
      phone: address.phone,
      city: {
        id: address.city.id,
        key: address.city.key,
        nameKa: address.city.nameKa,
        nameEn: address.city.nameEn,
        nameRu: address.city.nameRu,
      },
      street: address.street,
      building: address.building,
      apartment: address.apartment,
      postalCode: address.postalCode,
    };
  }

  const items: PlaceOrderItemInput[] = breakdown.items.map(({ stockQuantity: _stockQuantity, ...item }) => item);
  const statusId = await resolvePendingStatusId();

  for (let attempt = 0; attempt < MAX_ORDER_CODE_ATTEMPTS; attempt++) {
    try {
      const order = await ordersRepository.placeOrder({
        orderCode: generateOrderCode(),
        userId,
        fulfillmentMethod: input.fulfillmentMethod,
        statusId,
        addressId,
        shippingSnapshot,
        promoCodeId: breakdown.promoCode?.id ?? null,
        promoCodeSnapshot: breakdown.promoCode?.code ?? null,
        promoDiscountPercent: breakdown.promoCode?.discountPercent ?? null,
        subtotal: breakdown.subtotal,
        discountTotal: breakdown.discountTotal,
        total: breakdown.total,
        items,
      });
      return toOrderResponse(order);
    } catch (error) {
      if (isOrderCodeCollision(error) && attempt < MAX_ORDER_CODE_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError(500, "შეკვეთის კოდის გენერაცია ვერ მოხერხდა");
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
  }));
}

export async function getMyOrder(userId: number, id: number) {
  const row = await ordersRepository.findById(id);
  if (!row || row.userId !== userId) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }
  return toOrderResponse(row);
}

// Admin-only from here down — every caller of these is already gated by
// requireRole(ROLES.ADMIN) in orders.routes.ts, so unlike listMyOrders/
// getMyOrder above these never scope by owner.

export async function listAllOrders(filters: ListOrdersQuery) {
  const rows = await ordersRepository.findManyAdmin(filters);
  return rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    fulfillmentMethod: row.fulfillmentMethod,
    total: Number(row.total),
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.createdAt,
    buyer: row.user,
  }));
}

export async function getAnyOrder(id: number) {
  const row = await ordersRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "შეკვეთა ვერ მოიძებნა");
  }
  return { ...toOrderResponse(row), buyer: row.user };
}
