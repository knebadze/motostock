import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/index.js";

// Arbitrary, unique to this lock's purpose — same technique as
// fraud.service.ts's ACCOUNT_LOCKOUT_LOCK_NAMESPACE and
// orders.repository.ts's PROMO_CODE_LOCK_NAMESPACE.
const SORT_ORDER_LOCK_NAMESPACE = 468203917;

// Shared by every simple admin-ordered list (FAQ, team members, banks,
// service types, hero slides) whose create() computes "current max
// sortOrder + 1" and inserts at that position. The naive version — one
// aggregate() then a separate create() — is the same TOCTOU race
// fraud.service.ts's account lockout and orders.repository.ts's promo-code
// recheck already guard against: two concurrent creates (a double-clicked
// "add" button, two admin tabs) can both read the same max sortOrder before
// either commits, landing on an identical value instead of the newer row
// deterministically sorting last. `lockKey` scopes the lock to one table
// (e.g. "Faq") — unrelated tables never serialize against each other.
export async function withNextSortOrderLock<T>(
  lockKey: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SORT_ORDER_LOCK_NAMESPACE}, hashtext(${lockKey}))`;
    return fn(tx);
  });
}
