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
    data: { firstName: string; lastName: string; phone: string | null; dateOfBirth: Date | null },
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

  countOrders(userId: number) {
    return prisma.order.count({ where: { userId } });
  },

  // Orders not yet finished — deletion waits until they are.
  countActiveOrders(userId: number, finalStatusKeys: string[]) {
    return prisma.order.count({ where: { userId, status: { key: { notIn: finalStatusKeys } } } });
  },

  // No orders → the row and everything it owns goes (Cascade/SetNull on
  // every relation). Merged-away walk-in rows of the same person go too.
  deleteUser(userId: number, email: string) {
    return prisma.$transaction(async (tx) => {
      await deletePersonalExtras(tx, userId, email);
      await tx.user.delete({ where: { id: userId } });
    });
  },

  // Has orders → Order.userId is Restrict and the orders must be kept for
  // accounting, so the row stays as an anonymous stub: every personal field
  // is overwritten, logins are made impossible, and everything else the
  // user owns is deleted.
  anonymizeUser(userId: number, email: string, placeholderEmail: string, placeholderName: { first: string; last: string }) {
    return prisma.$transaction(async (tx) => {
      await deletePersonalExtras(tx, userId, email);
      await tx.address.deleteMany({ where: { userId } });
      await tx.garageVehicle.deleteMany({ where: { userId } });
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
          email: placeholderEmail,
          firstName: placeholderName.first,
          lastName: placeholderName.last,
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
    });
  },
};

// Shared by both deletion paths: data keyed by the email address rather
// than the user id, and walk-in rows already merged into this account.
async function deletePersonalExtras(tx: Prisma.TransactionClient, userId: number, email: string) {
  await tx.authEvent.deleteMany({ where: { OR: [{ userId }, { email }] } });
  await tx.newsletterSubscriber.deleteMany({ where: { email } });
  await tx.user.deleteMany({ where: { mergedIntoUserId: userId, isWalkIn: true, orders: { none: {} } } });
}
