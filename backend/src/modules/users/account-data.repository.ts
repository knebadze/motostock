import { ApiError } from "../../lib/ApiError.js";
import { prisma } from "../../config/prisma.js";
import type { Prisma, UserConsentMethod, UserConsentType } from "../../generated/prisma/index.js";

const EXPORT_HISTORY_LIMIT = 500;

// Self-service personal data (profile edit, consents, export, account
// deletion) — see account-data.service.ts.
export const accountDataRepository = {
  findProfile(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        passwordHash: true,
        googleId: true,
        facebookId: true,
        createdAt: true,
        role: { select: { name: true } },
        consents: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  updateProfile(
    userId: number,
    data: { firstName: string; lastName: string; phone?: string | null; dateOfBirth?: Date | null },
  ) {
    return prisma.user.update({ where: { id: userId }, data });
  },

  createConsents(
    rows: {
      userId: number;
      type: UserConsentType;
      method: UserConsentMethod;
      documentVersion: Date | null;
      ipAddress: string | null;
      userAgent: string | null;
    }[],
  ) {
    return prisma.userConsent.createMany({ data: rows });
  },

  // Everything stored about the user, for the "download my data" export.
  // Secrets (password hash, token hashes) are never selected.
  async collectExport(userId: number, email: string) {
    const [
      consents,
      addresses,
      garageVehicles,
      orders,
      wishlistItems,
      compareItems,
      cartItems,
      sessions,
      authEvents,
      productViews,
      vehicleListingViews,
      whatsappChats,
      newsletter,
    ] = await Promise.all([
      prisma.userConsent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.address.findMany({ where: { userId }, include: { city: true } }),
      prisma.garageVehicle.findMany({
        where: { userId },
        include: {
          vehicleCatalog: { include: { model: { include: { brand: true } } } },
          serviceRecords: { include: { serviceType: true }, orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        omit: {
          idempotencyKey: true,
          finaOutOperationId: true,
          finaSyncStatus: true,
          finaPushAttempts: true,
          finaPushLockedUntil: true,
          finaSaleSyncedAt: true,
          finaReturnSyncedAt: true,
          finaLastError: true,
          finaPushUncertain: true,
        },
        include: {
          items: true,
          status: true,
          statusHistory: { include: { status: true }, omit: { changedByUserId: true } },
          requests: { omit: { adminNote: true, resolvedByUserId: true } },
        },
      }),
      prisma.wishlistItem.findMany({ where: { userId } }),
      prisma.compareItem.findMany({ where: { userId } }),
      prisma.cartItem.findMany({ where: { userId } }),
      prisma.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.authEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: EXPORT_HISTORY_LIMIT,
      }),
      prisma.productView.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: EXPORT_HISTORY_LIMIT,
        include: { product: { select: { slug: true, nameKa: true } } },
      }),
      prisma.vehicleListingView.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: EXPORT_HISTORY_LIMIT,
      }),
      prisma.whatsAppChatSession.findMany({
        where: { userId },
        include: { messages: { orderBy: { createdAt: "asc" }, omit: { relayWhatsAppMessageId: true } } },
      }),
      prisma.newsletterSubscriber.findUnique({
        where: { email },
        omit: { confirmTokenHash: true, unsubscribeToken: true },
      }),
    ]);
    return {
      consents,
      addresses,
      garageVehicles,
      orders,
      wishlistItems,
      compareItems,
      cartItems,
      sessions,
      authEvents,
      productViews,
      vehicleListingViews,
      whatsappChats,
      newsletter,
    };
  },

  // Account deletion, decided and done in ONE transaction (the checks used to
  // run before it, so an order placed in between could send a now-ordering
  // account down the hard-delete path and fail on the Restrict FK as a 500).
  //
  // - An order still in progress blocks it (ApiError 409).
  // - Nothing the shop must keep (no orders, no workshop service history) →
  //   the row and everything it owns is deleted (Cascade/SetNull).
  // - Otherwise the row stays as an anonymous stub: personal fields
  //   overwritten, logins impossible, owned data deleted. Kept for the shop's
  //   own records: orders (accounting) with their delivery snapshot scrubbed
  //   down to the city, and garage vehicles that have workshop service
  //   history (minus the photo), with that history.
  //
  // Returns the garage photo URLs to delete from storage after commit.
  eraseAccount(args: {
    userId: number;
    email: string;
    phone: string | null;
    finalOrderStatusKeys: string[];
    placeholderEmail: string;
    placeholderName: { first: string; last: string };
  }) {
    const { userId, email, phone } = args;
    return prisma.$transaction(async (tx) => {
      const activeOrders = await tx.order.count({
        where: { userId, status: { key: { notIn: args.finalOrderStatusKeys } } },
      });
      if (activeOrders > 0) {
        throw new ApiError(409, "Account has orders in progress", "ACCOUNT_HAS_ACTIVE_ORDERS");
      }

      const vehicles = await tx.garageVehicle.findMany({
        where: { userId },
        select: { id: true, imageUrl: true, _count: { select: { serviceRecords: true } } },
      });
      const imageUrls = vehicles.map((vehicle) => vehicle.imageUrl).filter((url): url is string => url != null);
      const vehiclesWithHistory = vehicles.filter((vehicle) => vehicle._count.serviceRecords > 0);
      const orderCount = await tx.order.count({ where: { userId } });

      await deletePersonalExtras(tx, userId, email, phone);

      if (orderCount === 0 && vehiclesWithHistory.length === 0) {
        await tx.user.delete({ where: { id: userId } });
        return { anonymized: false, imageUrls };
      }

      // Orders: keep what accounting needs, drop the rest of the personal
      // data — the delivery snapshot keeps only the city; the checkout IP
      // and the customer's own request texts go.
      await tx.$executeRaw`
        UPDATE "dbo"."Order"
        SET "ipAddress" = NULL,
            "shippingSnapshot" = CASE
              WHEN "shippingSnapshot" IS NULL OR jsonb_typeof("shippingSnapshot") <> 'object'
                THEN "shippingSnapshot"
              ELSE jsonb_build_object(
                'city', "shippingSnapshot"->'city',
                'phone', '',
                'street', '',
                'building', NULL,
                'apartment', NULL,
                'postalCode', NULL
              )
            END
        WHERE "userId" = ${userId}`;
      await tx.orderRequest.updateMany({ where: { order: { userId } }, data: { reason: null } });

      // Garage: vehicles with workshop history stay (the shop's service
      // records), without their photo; the rest go.
      await tx.garageVehicle.deleteMany({
        where: { userId, id: { notIn: vehiclesWithHistory.map((vehicle) => vehicle.id) } },
      });
      await tx.garageVehicle.updateMany({ where: { userId }, data: { imageUrl: null } });

      await tx.address.deleteMany({ where: { userId } });
      await tx.wishlistItem.deleteMany({ where: { userId } });
      await tx.compareItem.deleteMany({ where: { userId } });
      await tx.cartItem.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.productView.deleteMany({ where: { userId } });
      await tx.vehicleListingView.deleteMany({ where: { userId } });
      await tx.visitorPresence.deleteMany({ where: { userId } });
      await tx.visitorVisit.deleteMany({ where: { userId } });
      await tx.whatsAppChatSession.deleteMany({ where: { userId } });
      await tx.userConsent.deleteMany({ where: { userId } });
      await tx.user.updateMany({ where: { phoneClaimedByUserId: userId }, data: { phoneClaimedByUserId: null } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: args.placeholderEmail,
          firstName: args.placeholderName.first,
          lastName: args.placeholderName.last,
          passwordHash: null,
          googleId: null,
          facebookId: null,
          phone: null,
          dateOfBirth: null,
          emailVerifiedAt: null,
          // Invalidates any token still in flight.
          tokenVersion: { increment: 1 },
        },
      });
      return { anonymized: true, imageUrls };
    });
  },
};

// Shared by both deletion paths: data keyed by the email address / phone
// rather than the user id, and walk-in rows already merged into this
// account.
async function deletePersonalExtras(
  tx: Prisma.TransactionClient,
  userId: number,
  email: string,
  phone: string | null,
) {
  await tx.authEvent.deleteMany({ where: { OR: [{ userId }, { email }] } });
  await tx.newsletterSubscriber.deleteMany({ where: { email } });
  // "Call me back" requests carry no user id — matched by the phone.
  if (phone) await tx.callbackRequest.deleteMany({ where: { phone } });
  await tx.user.deleteMany({ where: { mergedIntoUserId: userId, isWalkIn: true, orders: { none: {} } } });
}
