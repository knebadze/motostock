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

  // Burns every still-unused reset link of a user — called once their
  // password has changed (a reset via one link, or a logged-in change).
  // Otherwise an older link (several requested, or one sitting in a
  // compromised mailbox) stayed usable to take the account over again until
  // it expired.
  invalidateAllForUser(userId: number) {
    return prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  // resetPassword already rejects any token whose expiresAt is in the past
  // (see auth.service.ts), so a row past that point can never be claimed —
  // safe to delete outright instead of leaving it to accumulate forever.
  async deleteExpired(): Promise<number> {
    const { count } = await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  },
};
