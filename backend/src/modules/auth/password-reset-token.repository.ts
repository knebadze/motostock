import { prisma } from "../../config/prisma.js";

export const passwordResetTokenRepository = {
  create(data: { userId: number; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data });
  },

  findByTokenHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  },

  // Atomically marks the token used, but only if it's still unused — the
  // returned count tells the caller whether *this* call actually claimed it
  // (see auth.service.ts's resetPassword). Two concurrent requests presented
  // with the same token can both pass an upfront findByTokenHash check
  // (usedAt: null at the time each read it); only one of them wins the
  // UPDATE here, since Postgres serializes concurrent writes to the same
  // row and the second one's `usedAt: null` condition no longer matches
  // once the first has committed.
  claim(id: number) {
    return prisma.passwordResetToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};
