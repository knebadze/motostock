import { prisma } from "../../config/prisma.js";

// Storage limitation (personal data protection law): a "call me back"
// request holds a guest's name and phone only to make that call. Once
// staff have handled it, it's kept a while for reference, then deleted.
// Open (unhandled) ones are never pruned.
export const RESOLVED_CALLBACK_RETENTION_DAYS = 90;

export async function pruneResolvedCallbackRequests() {
  const cutoff = new Date(Date.now() - RESOLVED_CALLBACK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.callbackRequest.deleteMany({
    where: { status: "RESOLVED", resolvedAt: { lt: cutoff } },
  });
  return count;
}
