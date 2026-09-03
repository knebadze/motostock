import { prisma } from "../../config/prisma.js";

// Backs lib/jwt.ts's JwtPayload.sessionId — see session.prisma's comment
// for the full reasoning (a Session row is what makes logout actually
// revoke a token server-side, not just clear the browser's cookie).
export const sessionRepository = {
  create(userId: number) {
    return prisma.session.create({ data: { userId }, select: { id: true } });
  },

  findById(id: number) {
    return prisma.session.findUnique({ where: { id }, select: { id: true } });
  },

  // No-op (not an error) if the id doesn't exist — logout is best-effort
  // idempotent by design (see auth.controller.ts), so a token that's
  // already invalid/already-logged-out must not make this throw.
  async delete(id: number) {
    await prisma.session.deleteMany({ where: { id } });
  },
};
